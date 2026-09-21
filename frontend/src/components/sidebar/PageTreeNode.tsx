import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, FilePlus2, FolderPlus, MoreHorizontal, Trash2, Link2 } from 'lucide-react';
import type { PageSummary } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useWorkspaceStore } from '@/lib/store/workspace';
import { pagesApi } from '@/lib/api';
import IconGlyph from '@/components/IconGlyph';
import { toast } from 'sonner';
import type { DropPosition } from '@/lib/reorder';

interface Props {
  page: PageSummary;
  depth: number;
  spaceId: number;
  tree: Map<number | null, PageSummary[]>;
  activePageId: number | null;
  expanded: Set<number>;
  toggleExpanded: (id: number) => void;
  onDropPage: (draggedId: number, targetId: number, position: DropPosition) => void;
}

export default function PageTreeNode({
  page,
  depth,
  spaceId,
  tree,
  activePageId,
  expanded,
  toggleExpanded,
  onDropPage,
}: Props) {
  const navigate = useNavigate();
  const children = tree.get(page.id) || [];
  const isOpen = expanded.has(page.id);
  const isActive = activePageId === page.id;
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(page.title);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dropZone, setDropZone] = useState<DropPosition | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const patchPageLocal = useWorkspaceStore((s) => s.patchPageLocal);
  const createPage = useWorkspaceStore((s) => s.createPage);
  const deletePage = useWorkspaceStore((s) => s.deletePage);

  async function commitRename() {
    setRenaming(false);
    const trimmed = title.trim() || 'Senza titolo';
    if (trimmed === page.title) return;
    patchPageLocal(spaceId, page.id, { title: trimmed });
    try {
      await pagesApi.update(page.id, { title: trimmed });
    } catch {
      toast.error('Impossibile rinominare la pagina');
      patchPageLocal(spaceId, page.id, { title: page.title });
    }
  }

  async function addChild(kind: 'folder' | 'note') {
    if (!isOpen) toggleExpanded(page.id);
    const created = await createPage(
      spaceId,
      page.id,
      kind === 'folder' ? 'Nuova cartella' : 'Senza titolo',
      kind === 'folder' ? 'folder' : undefined
    );
    navigate(`/space/${spaceId}/page/${created.id}`);
  }

  async function handleDelete() {
    setDeleteOpen(false);
    try {
      await deletePage(spaceId, page.id);
      if (isActive || children.some((c) => c.id === activePageId)) navigate(`/space/${spaceId}`);
      toast.success('Pagina eliminata');
    } catch {
      toast.error('Impossibile eliminare la pagina');
    }
  }

  async function handleShare() {
    try {
      const { token } = await pagesApi.share(page.id);
      await navigator.clipboard.writeText(`${window.location.origin}/s/${token}`);
      toast.success('Link copiato negli appunti');
    } catch {
      toast.error('Solo chi ha creato la pagina può condividerla');
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (e.clientY - rect.top) / rect.height;
    setDropZone(ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'into');
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const draggedId = Number(e.dataTransfer.getData('text/page-id'));
    if (draggedId && dropZone) onDropPage(draggedId, page.id, dropZone);
    setDropZone(null);
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={rowRef}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/page-id', String(page.id))}
            onDragOver={onDragOver}
            onDragLeave={() => setDropZone(null)}
            onDrop={onDrop}
            className={cn(
              'group relative flex items-center gap-1 rounded-md py-1 pr-1 text-sm cursor-pointer select-none',
              isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-sidebar-foreground/90'
            )}
            style={{ paddingLeft: depth * 16 + 6 }}
            onClick={() => !renaming && navigate(`/space/${spaceId}/page/${page.id}`)}
          >
            {dropZone === 'before' && <div className="absolute left-1 right-1 top-0 h-0.5 rounded bg-primary" />}
            {dropZone === 'after' && <div className="absolute left-1 right-1 bottom-0 h-0.5 rounded bg-primary" />}
            {dropZone === 'into' && <div className="absolute inset-0.5 rounded-md ring-2 ring-primary" />}

            <button
              className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded', !children.length && 'invisible')}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(page.id);
              }}
            >
              <ChevronRight className={cn('h-3.5 w-3.5 transition-transform text-muted-foreground', isOpen && 'rotate-90')} />
            </button>

            <IconGlyph value={page.icon} kind="page" />

            {renaming ? (
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') {
                    setTitle(page.title);
                    setRenaming(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-6 flex-1 px-1 text-sm"
              />
            ) : (
              <span className="flex-1 truncate">{page.title}</span>
            )}

            <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
              <button
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-background"
                onClick={(e) => {
                  e.stopPropagation();
                  addChild('folder');
                }}
                aria-label="Nuova sottocartella"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
              <button
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-background"
                onClick={(e) => {
                  e.stopPropagation();
                  addChild('note');
                }}
                aria-label="Nuova sottonota"
              >
                <FilePlus2 className="h-3.5 w-3.5" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-background"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Altre azioni"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => setRenaming(true)}>Rinomina</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShare}>
                    <Link2 className="h-4 w-4" /> Condividi
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4" /> Elimina
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setRenaming(true)}>Rinomina</ContextMenuItem>
          <ContextMenuItem onClick={() => addChild('folder')}>
            <FolderPlus className="h-4 w-4" /> Nuova sottocartella
          </ContextMenuItem>
          <ContextMenuItem onClick={() => addChild('note')}>
            <FilePlus2 className="h-4 w-4" /> Nuova sottonota
          </ContextMenuItem>
          <ContextMenuItem onClick={handleShare}>
            <Link2 className="h-4 w-4" /> Condividi
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Elimina
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isOpen &&
        children.map((child) => (
          <PageTreeNode
            key={child.id}
            page={child}
            depth={depth + 1}
            spaceId={spaceId}
            tree={tree}
            activePageId={activePageId}
            expanded={expanded}
            toggleExpanded={toggleExpanded}
            onDropPage={onDropPage}
          />
        ))}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare &ldquo;{page.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              {children.length > 0
                ? `Verranno eliminate anche le ${children.length} sottopagine contenute. L'azione non è reversibile.`
                : "L'azione non è reversibile."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
