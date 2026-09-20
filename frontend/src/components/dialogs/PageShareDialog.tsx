import { useEffect, useState } from 'react';
import { Copy, Share2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pagesApi, ApiError } from '@/lib/api';
import { toast } from 'sonner';

export default function PageShareDialog({ pageId, initialToken }: { pageId: number; initialToken: string | null }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(initialToken);
  const [busy, setBusy] = useState(false);

  useEffect(() => setToken(initialToken), [initialToken, pageId]);

  async function toggle() {
    setBusy(true);
    try {
      if (token) {
        await pagesApi.unshare(pageId);
        setToken(null);
        toast.success('Condivisione revocata');
      } else {
        const res = await pagesApi.share(pageId);
        setToken(res.token);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Solo chi ha creato la pagina può condividerla');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!token) return;
    await navigator.clipboard.writeText(`${window.location.origin}/s/${token}`);
    toast.success('Link copiato negli appunti');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Condividi" className="shrink-0 px-2 sm:px-3">
          <Share2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Condividi</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="mb-3 text-sm text-muted-foreground">
          Chiunque abbia il link potrà leggere questa pagina, senza account.
        </p>
        {token && (
          <div className="mb-3 flex gap-2">
            <Input readOnly value={`${window.location.origin}/s/${token}`} className="font-mono text-xs" />
            <Button variant="outline" size="icon" aria-label="Copia link" onClick={copy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Button variant={token ? 'outline' : 'default'} onClick={toggle} disabled={busy} className="w-full">
          {token ? 'Revoca condivisione' : 'Genera link pubblico'}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
