import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { ResizableImage } from './ImageExtension';
import { editorExtensions, SlashCommands } from './extensions';
import { getToken } from '@/lib/api';
import { ApiError, pagesApi, uploadApi } from '@/lib/api';
import { presenceColor } from '@/lib/utils';
import type { PageFull } from '@/lib/types';

export type SaveStatus = 'saving' | 'saved' | 'syncing' | 'offline';
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface CollabUser {
  clientId: number;
  id: number;
  email: string;
  color: string;
}

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function useCollabEditor(pageId: number, user: { id: number; email: string }) {
  const [page, setPage] = useState<PageFull | null>(null);
  const [loading, setLoading] = useState(true);
  // The page was deleted (or access revoked) while it was open, or from
  // another device: there is nothing to edit and the caller must move away.
  const [missing, setMissing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [connection, setConnection] = useState<ConnectionStatus>('connecting');
  const [presentUsers, setPresentUsers] = useState<CollabUser[]>([]);

  const ydoc = useMemo(() => new Y.Doc(), [pageId]);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const localRef = useRef<IndexeddbPersistence | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastLocalEditAt = useRef(0);
  const pendingSave = useRef(false);
  const seededRef = useRef(false);
  const pageContentRef = useRef<Record<string, unknown> | null>(null);
  const [providerReady, setProviderReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMissing(false);
    seededRef.current = false;
    pageContentRef.current = null;
    setProviderReady(false);

    // Keep a copy of the document in the browser. Yjs merges it with
    // whatever the server has, so notes written while the wifi was down
    // survive a reload and sync themselves once it comes back.
    const local = new IndexeddbPersistence(`mykhub-page-${pageId}`, ydoc);
    localRef.current = local;

    (async () => {
      // Fetch and apply the REST snapshot's ydoc_state *before* opening the
      // socket, so the client starts from the same base state as the server
      // and the WS exchange is a delta, not a full resync.
      let full: PageFull | null = null;
      try {
        full = await pagesApi.get(pageId);
      } catch (err) {
        if (cancelled) return;
        // A page that is gone is not an outage: say so instead of hanging on
        // "Sincronizzazione…" over a stale IndexedDB copy.
        if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
          setMissing(true);
          setLoading(false);
          return;
        }
        // No network: carry on with whatever IndexedDB has for this page
        // rather than leaving a skeleton on screen. The socket below will
        // reconcile as soon as there is a connection again.
        await local.whenSynced;
        if (cancelled) return;
        setSaveStatus('offline');
        setConnection('disconnected');
        setLoading(false);
      }
      if (cancelled) return;
      if (full?.ydoc_state) {
        try {
          Y.applyUpdate(ydoc, base64ToUint8Array(full.ydoc_state));
        } catch {
          /* corrupt/absent state — start fresh, WS sync will reconcile */
        }
      }
      if (full) {
        pageContentRef.current = full.content as Record<string, unknown>;
        setPage(full);
        setLoading(false);
      }
      if (cancelled) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const serverUrl = `${wsProtocol}//${window.location.host}/collab`;
      const provider = new WebsocketProvider(serverUrl, `page-${pageId}`, ydoc, {
        params: { token: getToken() || '' },
      });
      providerRef.current = provider;
      setProviderReady(true);

      provider.on('status', ({ status }: { status: ConnectionStatus }) => setConnection(status));

      provider.on('sync', (isSynced: boolean) => {
        if (!isSynced || seededRef.current || cancelled) return;
        seededRef.current = true;
        const fragment = ydoc.getXmlFragment('default');
        const content = pageContentRef.current;
        if (fragment.length === 0 && content && Object.keys(content).length > 0) {
          // Seed the shared doc from the REST snapshot only if it is still
          // empty after the first sync — avoids clobbering another client's
          // concurrent write on a page opened for the very first time.
          editorRef.current?.commands.setContent(content);
        }
      });

      provider.awareness.setLocalStateField('user', {
        id: user.id,
        email: user.email,
        color: presenceColor(user.id),
      });
      provider.awareness.on('change', () => {
        const states = Array.from(provider.awareness.getStates().entries());
        setPresentUsers(
          states
            .filter(([clientId]) => clientId !== provider.awareness.clientID)
            .map(([clientId, state]) => ({
              clientId,
              id: (state as any).user?.id,
              email: (state as any).user?.email ?? '?',
              color: (state as any).user?.color ?? '#999',
            }))
            .filter((u) => u.email !== '?')
        );
      });
    })();

    return () => {
      cancelled = true;
      providerRef.current?.destroy();
      providerRef.current = null;
      localRef.current?.destroy();
      localRef.current = null;
      ydoc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, ydoc]);

  const editor = useEditor(
    {
      extensions: [
        // codeBlock: ours (syntax highlighting + language picker) replaces it.
        StarterKit.configure({ history: false, codeBlock: false }),
        Typography,
        Placeholder.configure({ placeholder: 'Scrivi qualcosa, o "/" per i comandi…' }),
        Link.configure({ openOnClick: false, autolink: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        TaskList,
        TaskItem.configure({ nested: true }),
        Underline,
        ResizableImage,
        ...editorExtensions,
        SlashCommands.configure({
          onPickImage: () => window.dispatchEvent(new CustomEvent('mykhub:pick-image')),
        }),
        Collaboration.configure({ document: ydoc }),
        ...(providerReady && providerRef.current
          ? [
              CollaborationCursor.configure({
                provider: providerRef.current,
                user: { name: user.email, color: presenceColor(user.id) },
              }),
            ]
          : []),
      ],
      editorProps: {
        attributes: {
          class: 'editor-content focus:outline-none',
          lang: 'it',
          // The notes are in Italian on an English system, where every other
          // word would be underlined as a typo.
          spellcheck: 'false',
        },
        handleDrop(view, event) {
          const file = event.dataTransfer?.files?.[0];
          if (!file || !file.type.startsWith('image/')) return false;
          event.preventDefault();
          insertUploadedImage(file);
          return true;
        },
        handlePaste(view, event) {
          const file = Array.from(event.clipboardData?.items || [])
            .find((i) => i.type.startsWith('image/'))
            ?.getAsFile();
          if (!file) return false;
          insertUploadedImage(file);
          return true;
        },
      },
      onUpdate: () => {
        lastLocalEditAt.current = Date.now();
        pendingSave.current = true;
        setSaveStatus('saving');
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => void flushSave(), 1000);
      },
    },
    [ydoc, providerReady]
  );

  const editorRef = useRef(editor);
  editorRef.current = editor;

  async function flushSave() {
    if (!editorRef.current) return;
    try {
      await pagesApi.update(pageId, { content: editorRef.current.getJSON() });
      pendingSave.current = false;
      setSaveStatus('saved');
    } catch {
      setSaveStatus('offline');
    }
  }
  const flushSaveRef = useRef(flushSave);
  flushSaveRef.current = flushSave;

  useEffect(() => {
    // Retry on a timer rather than only on the next keystroke: someone who
    // stops typing at the end of a lesson would otherwise never see their
    // last edits leave the browser.
    const retry = setInterval(() => {
      if (pendingSave.current) void flushSaveRef.current();
    }, 6000);
    return () => clearInterval(retry);
  }, []);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (!pendingSave.current) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  async function insertUploadedImage(file: File) {
    if (!editorRef.current) return;
    try {
      const { url } = await uploadApi.image(file);
      editorRef.current.chain().focus().setImage({ src: url }).run();
    } catch {
      /* surfaced via toast by the caller's onError if needed */
    }
  }

  // REST polling fallback while the socket is down — never overwrites
  // destructively, only applies incoming Yjs state on top of local edits.
  useEffect(() => {
    if (connection === 'connected') return;
    const interval = setInterval(async () => {
      const typingRecently = Date.now() - lastLocalEditAt.current < 5000;
      if (typingRecently) return;
      try {
        const fresh = await pagesApi.get(pageId);
        if (page && fresh.updated_at > page.updated_at && fresh.ydoc_state) {
          Y.applyUpdate(ydoc, base64ToUint8Array(fresh.ydoc_state));
          setPage(fresh);
        }
        setSaveStatus((s) => (s === 'offline' ? 'syncing' : s));
      } catch {
        setSaveStatus('offline');
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [connection, page, pageId, ydoc]);

  return { editor, page, loading, missing, saveStatus, connection, presentUsers, insertUploadedImage };
}
