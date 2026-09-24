import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@/components/editor/Editor';
import EditorTopBar from '@/components/editor/EditorTopBar';
import { useAuthStore } from '@/lib/store/auth';
import { rememberPage } from '@/lib/lastPage';
import type { CollabUser, ConnectionStatus, SaveStatus } from '@/components/editor/useCollabEditor';

export default function PageEditor() {
  const { spaceId, pageId } = useParams();
  const user = useAuthStore((s) => s.user);

  const [status, setStatus] = useState<{
    saveStatus: SaveStatus;
    connection: ConnectionStatus;
    presentUsers: CollabUser[];
    shareToken: string | null;
  }>({ saveStatus: 'saved', connection: 'connecting', presentUsers: [], shareToken: null });

  const onStatusChange = useCallback((s: typeof status) => setStatus(s), []);

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
        />
      </div>
    </div>
  );
}
