import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useWorkspaceStore } from '@/lib/store/workspace';
import SpaceSection from './SpaceSection';
import NewSpacePopover from './NewSpacePopover';
import UserMenu from './UserMenu';
import { Skeleton } from '@/components/ui/skeleton';

export default function Sidebar() {
  const params = useParams();
  const spaces = useWorkspaceStore((s) => s.spaces);
  const spacesLoaded = useWorkspaceStore((s) => s.spacesLoaded);
  const loadSpaces = useWorkspaceStore((s) => s.loadSpaces);
  const pagesBySpace = useWorkspaceStore((s) => s.pagesBySpace);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!spacesLoaded) loadSpaces();
  }, [spacesLoaded, loadSpaces]);

  const query = filter.trim().toLowerCase();
  const matchingSpaceIds = useMemo(() => {
    if (!query) return null;
    const ids = new Set<number>();
    for (const space of spaces) {
      if (space.name.toLowerCase().includes(query)) ids.add(space.id);
      const pages = pagesBySpace[space.id] || [];
      if (pages.some((p) => p.title.toLowerCase().includes(query))) ids.add(space.id);
    }
    return ids;
  }, [query, spaces, pagesBySpace]);

  const visibleSpaces = query ? spaces.filter((s) => matchingSpaceIds?.has(s.id)) : spaces;

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex flex-col gap-2 p-2">
        <UserMenu />
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtra per titolo…"
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      <ScrollArea className="flex-1 px-2 py-2">
        {!spacesLoaded && (
          <div className="flex flex-col gap-2 px-1.5 py-1">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        )}
        {spacesLoaded && visibleSpaces.length === 0 && !query && (
          <p className="px-1.5 py-2 text-xs text-muted-foreground">Nessuno spazio ancora. Creane uno qui sotto.</p>
        )}
        {spacesLoaded && query && visibleSpaces.length === 0 && (
          <p className="px-1.5 py-2 text-xs text-muted-foreground">Nessun risultato per &ldquo;{filter}&rdquo;.</p>
        )}
        <div className="flex flex-col gap-0.5">
          {visibleSpaces.map((space) => (
            <SpaceSection key={space.id} space={space} defaultOpen={params.spaceId === String(space.id)} />
          ))}
        </div>
      </ScrollArea>

      <Separator className="bg-sidebar-border" />
      <div className="p-2">
        <NewSpacePopover />
      </div>
    </div>
  );
}
