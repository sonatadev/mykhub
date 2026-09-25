import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@/components/editor/Editor';
import EditorTopBar from '@/components/editor/EditorTopBar';
import { useAuthStore } from '@/lib/store/auth';
import { forgetPage, rememberPage } from '@/lib/lastPage';
import { useWorkspaceStore } from '@/lib/store/workspace';
import type { CollabUser, ConnectionStatus, SaveStatus } from '@/components/editor/useCollabEditor';

export default function PageEditor() {
  const { spaceId, pageId } = useParams();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const loadPages = useWorkspaceStore((s) => s.loadPages);

  const [status, setStatus] = useState<{
    saveStatus: SaveStatus;
    connection: ConnectionStatus;
    presentUsers: CollabUser[];
    shareToken: string | null;
  }>({ saveStatus: 'saved', connection: 'connecting', presentUsers: [], shareToken: null });

  const onStatusChange = useCallback((s: typeof status) => setStatus(s), []);

  // Deleted from another device (or from this one, in another tab): drop it
  // from the sidebar and from the "last page" memory, then fall back to the
  // space, which reopens whatever note is still there.
  const onMissing = useCallback(() => {
    if (!user || !spaceId || !pageId) return;
    forgetPage(user.id, Number(spaceId), Number(pageId));
    loadPages(Number(spaceId));
    navigate(`/space/${spaceId}`, { replace: true });
  }, [user, spaceId, pageId, loadPages, navigate]);

  useEffect(() => {
    if (!user || !spaceId || !pageId) return;
    rememberPage(user.id, Number(spaceId), Number(pageId));
  }, [user, spaceId, pageId]);

  if (!user || !spaceId || !pageId) return null;

  return (
    <div className="flex h-full flex-col">
      <EditorTopBar
        spaceId={Number(spaceId)}
        pageId={Number(pageId)}
        shareToken={status.shareToken}
        saveStatus={status.saveStatus}
        connection={status.connection}
        presentUsers={status.presentUsers}
      />
      <div className="min-h-0 flex-1">
        <Editor
          key={pageId}
          pageId={Number(pageId)}
          user={{ id: user.id, email: user.email }}
          contentFont={user.settings.font ?? 'inter'}
          onStatusChange={onStatusChange}
          onMissing={onMissing}
        />
      </div>
    </div>
  );
}
