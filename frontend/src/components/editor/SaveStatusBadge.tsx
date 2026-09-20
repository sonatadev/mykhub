import { cn } from '@/lib/utils';
import type { SaveStatus, ConnectionStatus } from './useCollabEditor';

const LABEL: Record<SaveStatus, string> = {
  saving: 'Salvataggio…',
  saved: 'Salvato',
  syncing: 'Sincronizzazione…',
  offline: 'Offline',
};

const DOT: Record<SaveStatus, string> = {
  saving: 'bg-warning animate-pulse',
  saved: 'bg-success',
  syncing: 'bg-warning animate-pulse',
  offline: 'bg-muted-foreground',
};

export default function SaveStatusBadge({
  saveStatus,
  connection,
}: {
  saveStatus: SaveStatus;
  connection: ConnectionStatus;
}) {
  const effective: SaveStatus = connection === 'connected' ? saveStatus : connection === 'connecting' ? 'syncing' : saveStatus === 'saving' ? 'saving' : 'syncing';
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground" title={LABEL[effective]}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT[effective])} />
      <span className="hidden sm:inline">{LABEL[effective]}</span>
    </div>
  );
}
