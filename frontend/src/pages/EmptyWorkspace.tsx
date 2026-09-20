import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotebookText, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/lib/store/workspace';
import { useUiStore } from '@/lib/store/ui';
import NewSpacePopover from '@/components/sidebar/NewSpacePopover';

export default function EmptyWorkspace() {
  const navigate = useNavigate();
  const spaces = useWorkspaceStore((s) => s.spaces);
  const spacesLoaded = useWorkspaceStore((s) => s.spacesLoaded);
  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen);

  useEffect(() => {
    if (spacesLoaded && spaces.length > 0) navigate(`/space/${spaces[0].id}`, { replace: true });
  }, [spacesLoaded, spaces, navigate]);

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
