import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Menu, FilePlus2, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/lib/store/workspace';
import { useUiStore } from '@/lib/store/ui';
import { useAuthStore } from '@/lib/store/auth';
import { lastPageInSpace } from '@/lib/lastPage';
import { buildTree } from '@/lib/reorder';
import IconGlyph from '@/components/IconGlyph';

export default function SpaceHome() {
  const { spaceId } = useParams();
  const id = Number(spaceId);
  const navigate = useNavigate();
  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const userId = useAuthStore((s) => s.user?.id);

  const space = useWorkspaceStore((s) => s.spaces.find((sp) => sp.id === id));
  const pages = useWorkspaceStore((s) => s.pagesBySpace[id]);
  const loadPages = useWorkspaceStore((s) => s.loadPages);
  const createPage = useWorkspaceStore((s) => s.createPage);

  useEffect(() => {
    if (!pages) loadPages(id);
  }, [id, pages, loadPages]);

  useEffect(() => {
    if (!pages) return;
    const tree = buildTree(pages);
    const roots = tree.get(null) || [];
    // The page this space was left on, as long as it still exists; the first
    // one in the sidebar is only the fallback.
    const remembered = userId != null ? lastPageInSpace(userId, id) : null;
    const target = pages.find((p) => p.id === remembered) ?? roots[0];
    if (target) navigate(`/space/${id}/page/${target.id}`, { replace: true });
  }, [pages, id, userId, navigate]);

  async function addPage(kind: 'folder' | 'note') {
    const created = await createPage(
      id,
      null,
      kind === 'folder' ? 'Nuova cartella' : 'Senza titolo',
      kind === 'folder' ? 'folder' : undefined
    );
    navigate(`/space/${id}/page/${created.id}`);
  }

  if (!pages || (pages.length > 0 && (buildTree(pages).get(null) || []).length > 0)) {
    return (
      <div className="flex h-12 items-center gap-2 border-b border-border px-3 md:hidden">
        <Button variant="ghost" size="icon" aria-label="Apri il menu" onClick={() => setMobileSidebarOpen(true)}>
          <Menu className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center gap-2 border-b border-border px-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Apri il menu"
          className="md:hidden"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <IconGlyph value={space?.icon} kind="space" /> {space?.name}
        </span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted-foreground">Questo spazio non ha ancora pagine.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => addPage('folder')}>
            <FolderPlus className="h-4 w-4" /> Nuova cartella
          </Button>
          <Button onClick={() => addPage('note')}>
            <FilePlus2 className="h-4 w-4" /> Nuova nota
          </Button>
        </div>
      </div>
    </div>
  );
}
