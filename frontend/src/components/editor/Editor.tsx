import { useEffect, useRef, useState } from 'react';
import { EditorContent } from '@tiptap/react';
import { toast } from 'sonner';
import Toolbar from './Toolbar';
import MathKeyBar from './MathKeyBar';
import { useCollabEditor, type SaveStatus, type ConnectionStatus, type CollabUser } from './useCollabEditor';
import { pagesApi, uploadApi, ApiError } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import type { ContentFont } from '@/lib/types';
import { useWorkspaceStore } from '@/lib/store/workspace';
import { useUiStore } from '@/lib/store/ui';

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
  // Mirrors the title textarea: a textarea prints as an empty box, so the
  // printed page renders this heading instead.
  const [titleText, setTitleText] = useState('');

  useEffect(() => {
    onStatusChange({ saveStatus, connection, presentUsers, shareToken: page?.share_token ?? null });
  }, [saveStatus, connection, presentUsers, page?.share_token, onStatusChange]);

  useEffect(() => {
    if (titleRef.current) titleRef.current.value = page?.title ?? '';
    setTitleText(page?.title ?? '');
  }, [page?.id, page?.title]);

  useEffect(() => {
    // Publish the editor so global UI (the command palette) can write into it.
    const { setActiveEditor } = useUiStore.getState();
    setActiveEditor(editor ?? null);
    return () => setActiveEditor(null);
  }, [editor]);

  useEffect(() => {
    const open = () => fileInputRef.current?.click();
    window.addEventListener('mykhub:pick-image', open);
    return () => window.removeEventListener('mykhub:pick-image', open);
  }, []);

  useEffect(() => {
    if (!editor) return;
    // An inline formula shows its LaTeX source while the caret sits inside it,
    // which would land on paper as `$…$`. Making the editor read-only for the
    // duration of the print forces every formula back to its rendered form.
    function print() {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      editor.setEditable(false);
      editor.commands.setTextSelection(0);
      window.print();
      editor.setEditable(true);
      editor.commands.setTextSelection({ from, to });
    }
    window.addEventListener('mykhub:print', print);
    return () => window.removeEventListener('mykhub:print', print);
  }, [editor]);

  function onTitleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    setTitleText(el.value);
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
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-3 rounded-2xl border-2 border-border bg-card px-8 py-10 shadow-sm sm:px-14">
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
      <div className="editor-scroll flex-1 overflow-y-auto bg-muted/40 px-4 py-8 sm:px-8 print:overflow-visible print:bg-transparent print:p-0">
        <div className="printable mx-auto w-full max-w-[760px] rounded-2xl border-2 border-border bg-card px-8 py-10 shadow-sm sm:px-14">
          <h1 className="hidden font-serif text-3xl font-semibold leading-tight print:block">{titleText}</h1>
          <textarea
            ref={titleRef}
            rows={1}
            placeholder="Senza titolo"
            onInput={onTitleInput}
            className="w-full resize-none overflow-hidden border-none bg-transparent font-serif text-3xl font-semibold leading-tight text-primary outline-none placeholder:text-muted-foreground/50 print:hidden"
          />
          <div data-font={contentFont === 'inter' ? undefined : contentFont}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
      <MathKeyBar editor={editor} />
    </div>
  );
}
