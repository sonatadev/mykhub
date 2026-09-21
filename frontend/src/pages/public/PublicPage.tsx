import { useEffect, useState } from 'react';
import { NotebookText } from 'lucide-react';
import { publicApi, ApiError } from '@/lib/api';
import type { PublicPage as PublicPageData } from '@/lib/types';
import ReadOnlyContent from '@/components/editor/ReadOnlyContent';
import { Skeleton } from '@/components/ui/skeleton';
import IconGlyph from '@/components/IconGlyph';

function tokenFromPath() {
  const m = window.location.pathname.match(/\/s\/([a-f0-9]+)/);
  return m?.[1] ?? null;
}

export default function PublicPage() {
  const [page, setPage] = useState<PublicPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = tokenFromPath();
    if (!token) {
      setError('Link non valido.');
      return;
    }
    publicApi
      .page(token)
      .then(setPage)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Pagina non trovata.'));
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
        <NotebookText className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-muted/40 px-4 py-10 sm:px-8 sm:py-16">
        <div className="mx-auto flex max-w-[720px] flex-col gap-3 rounded-2xl border border-border bg-card px-6 py-10 shadow-sm sm:px-14">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-[720px] rounded-2xl border border-border bg-card px-6 py-10 shadow-sm sm:px-14">
        <div className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <IconGlyph value={page.space_icon} kind="space" className="h-3.5 w-3.5" /> {page.space_name}
          </span>
          {page.breadcrumb.map((title, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span>/</span>
              <span>{title}</span>
            </span>
          ))}
        </div>
        <h1 className="mb-6 flex items-center gap-2.5 font-serif text-3xl font-semibold leading-tight text-primary">
          <IconGlyph value={page.icon} kind="page" className="h-7 w-7" /> {page.title}
        </h1>
        <ReadOnlyContent content={page.content} />
      </div>
    </div>
  );
}
