import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/lib/store/workspace';
import { useUiStore } from '@/lib/store/ui';
import PresenceAvatars from './PresenceAvatars';
import SaveStatusBadge from './SaveStatusBadge';
import PageShareDialog from '@/components/dialogs/PageShareDialog';
import type { CollabUser, ConnectionStatus, SaveStatus } from './useCollabEditor';

export default function EditorTopBar({
  spaceId,
  pageId,
  shareToken,
  saveStatus,
  connection,
  presentUsers,
}: {
  spaceId: number;
  pageId: number;
  shareToken: string | null;
  saveStatus: SaveStatus;
  connection: ConnectionStatus;
  presentUsers: CollabUser[];
}) {
  const navigate = useNavigate();
  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const space = useWorkspaceStore((s) => s.spaces.find((sp) => sp.id === spaceId));
  const pages = useWorkspaceStore((s) => s.pagesBySpace[spaceId]);

  const trail = useMemo(() => {
    if (!pages) return [];
    const byId = new Map(pages.map((p) => [p.id, p]));
    const chain = [];
    let cur = byId.get(pageId);
    while (cur) {
      chain.unshift(cur);
      cur = cur.parent_page_id ? byId.get(cur.parent_page_id) : undefined;
    }
    return chain;
  }, [pages, pageId]);

  return (
    <div className="flex h-12 items-center gap-2 border-b border-border px-3">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Apri il menu"
        className="shrink-0 md:hidden"
        onClick={() => setMobileSidebarOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
        <BreadcrumbList className="flex-nowrap">
          <span className="hidden items-center gap-1.5 sm:flex">
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate(`/space/${spaceId}`)} className="cursor-pointer">
                {space?.icon} {space?.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {trail.slice(0, -1).map((p) => (
              <span key={p.id} className="flex items-center gap-1.5">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => navigate(`/space/${spaceId}/page/${p.id}`)} className="cursor-pointer">
                    {p.icon} {p.title}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </span>
            ))}
            {trail.length > 0 && <BreadcrumbSeparator />}
          </span>
          {trail.length > 0 && (
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-[11rem] sm:max-w-[14rem]">
                {trail[trail.length - 1].icon} {trail[trail.length - 1].title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <SaveStatusBadge saveStatus={saveStatus} connection={connection} />
      <PresenceAvatars users={presentUsers} />
      <PageShareDialog pageId={pageId} initialToken={shareToken} />
    </div>
  );
}
