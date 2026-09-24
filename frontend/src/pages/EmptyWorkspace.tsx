import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotebookText, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/lib/store/workspace';
import { useUiStore } from '@/lib/store/ui';
import { useAuthStore } from '@/lib/store/auth';
import { lastSpaceId } from '@/lib/lastPage';
import NewSpacePopover from '@/components/sidebar/NewSpacePopover';

export default function EmptyWorkspace() {
  const navigate = useNavigate();
  const spaces = useWorkspaceStore((s) => s.spaces);
  const spacesLoaded = useWorkspaceStore((s) => s.spacesLoaded);
  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!spacesLoaded || spaces.length === 0) return;
    // Head for the space that was open last; SpaceHome then picks the page
    // inside it, which is also where a page that has since been deleted is
    // caught and replaced with a real one.
    const remembered = userId != null ? lastSpaceId(userId) : null;
    const target = spaces.find((s) => s.id === remembered) ?? spaces[0];
    navigate(`/space/${target.id}`, { replace: true });
  }, [spacesLoaded, spaces, userId, navigate]);

  if (!spacesLoaded || spaces.length > 0) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center gap-2 border-b border-border px-3 md:hidden">
        <Button variant="ghost" size="icon" aria-label="Apri il menu" onClick={() => setMobileSidebarOpen(true)}>
          <Menu className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <NotebookText className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold">Nessuno spazio ancora</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Uno spazio è una cartella di primo livello: creane uno per iniziare a scrivere.
        </p>
        <div className="w-48">
          <NewSpacePopover />
        </div>
      </div>
    </div>
  );
}
