import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, MoreHorizontal, Plus, Settings, Users } from 'lucide-react';
import type { Space } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/lib/store/workspace';
import { buildTree, computeReorder, type DropPosition } from '@/lib/reorder';
import PageTreeNode from './PageTreeNode';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SpaceSettingsDialog from '@/components/dialogs/SpaceSettingsDialog';
import { toast } from 'sonner';

export default function SpaceSection({
  space,
  defaultOpen,
  onDragHandleProps,
}: {
  space: Space;
  defaultOpen: boolean;
  onDragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const navigate = useNavigate();
  const params = useParams();
  const [open, setOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const pages = useWorkspaceStore((s) => s.pagesBySpace[space.id]);
  const loading = useWorkspaceStore((s) => s.loadingSpaces[space.id]);
  const loadPages = useWorkspaceStore((s) => s.loadPages);
  const createPage = useWorkspaceStore((s) => s.createPage);
  const movePage = useWorkspaceStore((s) => s.movePage);

  const activePageId = params.spaceId === String(space.id) && params.pageId ? Number(params.pageId) : null;

  useEffect(() => {
    if (open && !pages) loadPages(space.id);
  }, [open, pages, loadPages, space.id]);

  useEffect(() => {
    if (params.spaceId === String(space.id) && !open) setOpen(true);
  }, [params.spaceId, space.id]);

  // Auto-expand the ancestor chain of the active page.
  useEffect(() => {
    if (!activePageId || !pages) return;
    const byId = new Map(pages.map((p) => [p.id, p]));
    const toExpand: number[] = [];
    let cur = byId.get(activePageId)?.parent_page_id ?? null;
    while (cur != null) {
      toExpand.push(cur);
      cur = byId.get(cur)?.parent_page_id ?? null;
    }
    if (toExpand.length) setExpanded((prev) => new Set([...prev, ...toExpand]));
  }, [activePageId, pages]);

  const tree = useMemo(() => buildTree(pages || []), [pages]);
  const rootPages = tree.get(null) || [];

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleDropPage(draggedId: number, targetId: number, position: DropPosition) {
    if (!pages) return;
    const updates = computeReorder(pages, draggedId, targetId, position);
    if (!updates) return;
    try {
      await movePage(space.id, updates);
    } catch {
      toast.error('Impossibile spostare la pagina');
      loadPages(space.id);
    }
  }

  async function addRootPage() {
    setOpen(true);
    const created = await createPage(space.id, null, 'Senza titolo');
    navigate(`/space/${space.id}/page/${created.id}`);
  }

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-1.5 py-1 text-sm font-medium cursor-pointer',
          params.spaceId === String(space.id) && !activePageId ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
        )}
        onClick={() => {
          setOpen((o) => !o);
          navigate(`/space/${space.id}`);
        }}
      >
        <button
          className="flex h-4 w-4 items-center justify-center rounded"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
        </button>
        <span className="text-[15px] leading-none">{space.icon}</span>
        <span className="flex-1 truncate">{space.name}</span>
        {space.role === 'member' && (
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
            membro
          </Badge>
        )}
        <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          <button
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-background"
            onClick={(e) => {
              e.stopPropagation();
              addRootPage();
            }}
            aria-label="Nuova pagina"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-background"
                onClick={(e) => e.stopPropagation()}
                aria-label="Impostazioni spazio"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" /> Impostazioni spazio
              </DropdownMenuItem>
              {space.role === 'owner' && (
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Users className="h-4 w-4" /> Membri e condivisione
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {open && (
        <div className="mt-0.5">
          {loading && !pages && (
            <div className="flex flex-col gap-1.5 py-1 pl-7">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}
          {rootPages.map((page) => (
            <PageTreeNode
              key={page.id}
              page={page}
              depth={1}
              spaceId={space.id}
              tree={tree}
              activePageId={activePageId}
              expanded={expanded}
              toggleExpanded={toggleExpanded}
              onDropPage={handleDropPage}
            />
          ))}
          {pages && rootPages.length === 0 && (
            <button
              onClick={addRootPage}
              className="ml-6 flex items-center gap-1.5 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> Nuova pagina
            </button>
          )}
        </div>
      )}

      <SpaceSettingsDialog space={space} open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
