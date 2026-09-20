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
import { ResizableImage } from './ImageExtension';
import { getToken } from '@/lib/api';
import { pagesApi, uploadApi } from '@/lib/api';
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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [connection, setConnection] = useState<ConnectionStatus>('connecting');
  const [presentUsers, setPresentUsers] = useState<CollabUser[]>([]);

  const ydoc = useMemo(() => new Y.Doc(), [pageId]);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastLocalEditAt = useRef(0);
  const seededRef = useRef(false);
  const pageContentRef = useRef<Record<string, unknown> | null>(null);
  const [providerReady, setProviderReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    seededRef.current = false;
    pageContentRef.current = null;
    setProviderReady(false);

    (async () => {
      // Fetch and apply the REST snapshot's ydoc_state *before* opening the
      // socket, so the client starts from the same base state as the server
      // and the WS exchange is a delta, not a full resync.
      const full = await pagesApi.get(pageId);
      if (cancelled) return;
      if (full.ydoc_state) {
        try {
          Y.applyUpdate(ydoc, base64ToUint8Array(full.ydoc_state));
        } catch {
          /* corrupt/absent state — start fresh, WS sync will reconcile */
        }
      }
      pageContentRef.current = full.content as Record<string, unknown>;
      setPage(full);
      setLoading(false);
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
      ydoc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, ydoc]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ history: false }),
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
        attributes: { class: 'editor-content focus:outline-none' },
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
        setSaveStatus('saving');
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
          try {
            await pagesApi.update(pageId, { content: editorRef.current?.getJSON() });
            setSaveStatus('saved');
          } catch {
            setSaveStatus('offline');
          }
        }, 1000);
      },
    },
    [ydoc, providerReady]
  );

  const editorRef = useRef(editor);
  editorRef.current = editor;

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

  return { editor, page, loading, saveStatus, connection, presentUsers, insertUploadedImage };
}
