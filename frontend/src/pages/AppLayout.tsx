import { Outlet } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import Sidebar from '@/components/sidebar/Sidebar';
import { useUiStore } from '@/lib/store/ui';
import CommandPalette from '@/components/CommandPalette';

export default function AppLayout() {
  const mobileSidebarOpen = useUiStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-background print:block print:h-auto print:overflow-visible">
      <aside className="hidden w-[280px] shrink-0 border-r border-sidebar-border md:block print:hidden">
        <Sidebar />
      </aside>

      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 md:hidden">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>

      <CommandPalette />
    </div>
  );
}
