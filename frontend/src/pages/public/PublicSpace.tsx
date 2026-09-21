import { useEffect, useMemo, useState } from 'react';
import { Menu, NotebookText } from 'lucide-react';
import { publicApi, ApiError } from '@/lib/api';
import type { PublicSpaceData } from '@/lib/types';
import ReadOnlyContent from '@/components/editor/ReadOnlyContent';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { buildTree } from '@/lib/reorder';
import { cn } from '@/lib/utils';
import IconGlyph from '@/components/IconGlyph';

function tokenFromPath() {
  const m = window.location.pathname.match(/\/ws\/([a-f0-9]+)/);
  return m?.[1] ?? null;
}

function TocTree({
  tree,
  parentId,
  depth,
  activeId,
  onSelect,
}: {
  tree: Map<number | null, PublicSpaceData['pages']>;
  parentId: number | null;
  depth: number;
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  const children = tree.get(parentId) || [];
  if (!children.length) return null;
  return (
    <div className="flex flex-col">
      {children.map((p) => (
        <div key={p.id}>
          <button
            onClick={() => onSelect(p.id)}
            style={{ paddingLeft: depth * 14 + 10 }}
            className={cn(
              'flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-sm truncate',
              activeId === p.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60 text-foreground/80'
            )}
          >
            <IconGlyph value={p.icon} kind="page" />
            <span className="truncate">{p.title}</span>
          </button>
          <TocTree tree={tree} parentId={p.id} depth={depth + 1} activeId={activeId} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}

export default function PublicSpace() {
  const [data, setData] = useState<PublicSpaceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const token = tokenFromPath();
    if (!token) {
      setError('Link non valido.');
      return;
    }
    publicApi
      .space(token)
      .then((res) => {
        setData(res);
        const tree = buildTree(res.pages as any);
        const roots = tree.get(null) || [];
        if (roots[0]) setActiveId(roots[0].id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Spazio non trovato.'));
  }, []);

  const tree = useMemo(() => (data ? buildTree(data.pages as any) : new Map()), [data]);
  const activePage = data?.pages.find((p) => p.id === activeId);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
        <NotebookText className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-6 py-16">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  const toc = (
    <div className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      <div className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold">
        <IconGlyph value={data.space.icon} kind="space" /> {data.space.name}
      </div>
      <TocTree tree={tree} parentId={null} depth={0} activeId={activeId} onSelect={setActiveId} />
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border md:block">{toc}</aside>
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-72 p-0 md:hidden">
          {toc}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-muted/40">
        <div className="flex h-12 shrink-0 items-center border-b border-border px-3 md:hidden">
          <Button variant="ghost" size="icon" aria-label="Apri l'indice" onClick={() => setDrawerOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        {activePage ? (
          <div className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6 sm:py-12">
            <div className="rounded-2xl border border-border bg-card px-6 py-10 shadow-sm sm:px-14">
              <h1 className="mb-6 flex items-center gap-2.5 font-serif text-3xl font-semibold leading-tight text-primary">
                <IconGlyph value={activePage.icon} kind="page" className="h-7 w-7" /> {activePage.title}
              </h1>
              <ReadOnlyContent content={activePage.content} />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Questo spazio non contiene ancora pagine.
          </div>
        )}
      </div>
    </div>
  );
}
