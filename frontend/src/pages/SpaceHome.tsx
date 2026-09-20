import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Menu, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/lib/store/workspace';
import { useUiStore } from '@/lib/store/ui';
import { buildTree } from '@/lib/reorder';

export default function SpaceHome() {
  const { spaceId } = useParams();
  const id = Number(spaceId);
  const navigate = useNavigate();
  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen);

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
    if (roots.length > 0) navigate(`/space/${id}/page/${roots[0].id}`, { replace: true });
  }, [pages, id, navigate]);

  async function addPage() {
    const created = await createPage(id, null, 'Senza titolo');
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
        <span className="text-sm font-medium">
          {space?.icon} {space?.name}
        </span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted-foreground">Questo spazio non ha ancora pagine.</p>
        <Button onClick={addPage}>
          <Plus className="h-4 w-4" /> Nuova pagina
        </Button>
      </div>
    </div>
  );
}
