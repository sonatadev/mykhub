import { useEffect, useRef } from 'react';
import { EditorContent } from '@tiptap/react';
import { toast } from 'sonner';
import Toolbar from './Toolbar';
import { useCollabEditor, type SaveStatus, type ConnectionStatus, type CollabUser } from './useCollabEditor';
import { pagesApi, uploadApi, ApiError } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import type { ContentFont } from '@/lib/types';
import { useWorkspaceStore } from '@/lib/store/workspace';

export default function Editor({
  pageId,
  user,
  contentFont,
  onStatusChange,
}: {
  pageId: number;
  user: { id: number; email: string };
  contentFont: ContentFont;
  onStatusChange: (state: {
    saveStatus: SaveStatus;
    connection: ConnectionStatus;
    presentUsers: CollabUser[];
    shareToken: string | null;
  }) => void;
}) {
  const { editor, page, loading, saveStatus, connection, presentUsers, insertUploadedImage } = useCollabEditor(
    pageId,
    user
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    onStatusChange({ saveStatus, connection, presentUsers, shareToken: page?.share_token ?? null });
  }, [saveStatus, connection, presentUsers, page?.share_token, onStatusChange]);

  useEffect(() => {
    if (titleRef.current) titleRef.current.value = page?.title ?? '';
  }, [page?.id, page?.title]);

  function onTitleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    clearTimeout(titleSaveTimer.current);
    titleSaveTimer.current = setTimeout(() => {
      const title = el.value.trim() || 'Senza titolo';
      const spaceId = page?.space_id;
      if (spaceId) useWorkspaceStore.getState().patchPageLocal(spaceId, pageId, { title });
      pagesApi.update(pageId, { title }).catch(() => toast.error('Impossibile salvare il titolo'));
    }, 1000);
  }

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (!editor) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        pagesApi
          .update(pageId, { content: editor.getJSON() })
          .then(() => toast.success('Salvato'))
          .catch(() => toast.error('Impossibile salvare'));
      }
      if (mod && e.key.toLowerCase() === 'k' && editor.isFocused) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('mykhub:open-link-popover'));
      }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [editor, pageId]);

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Immagine troppo grande (max 20MB)');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast.error('Formato non supportato (jpg, png, gif, webp)');
      return;
    }
    try {
      await insertUploadedImage(file);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Caricamento immagine non riuscito');
    }
  }

  if (loading || !editor) {
    return (
      <div className="h-full overflow-y-auto bg-muted/40 px-4 py-8 sm:px-8">
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-3 rounded-2xl border border-border bg-card px-8 py-10 shadow-sm sm:px-14">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Toolbar editor={editor} onPickImage={() => fileInputRef.current?.click()} />
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={onFilePicked} />
      <div className="flex-1 overflow-y-auto bg-muted/40 px-4 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-[760px] rounded-2xl border border-border bg-card px-8 py-10 shadow-sm sm:px-14">
          <textarea
            ref={titleRef}
            rows={1}
            placeholder="Senza titolo"
            onInput={onTitleInput}
            className="w-full resize-none overflow-hidden border-none bg-transparent font-serif text-3xl font-semibold leading-tight text-primary outline-none placeholder:text-muted-foreground/50"
          />
          <div data-font={contentFont === 'inter' ? undefined : contentFont}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
