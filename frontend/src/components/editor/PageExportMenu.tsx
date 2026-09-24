import { useState } from 'react';
import { Download, FileCode2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { pagesApi, ApiError } from '@/lib/api';
import { downloadLatex } from '@/lib/latex';

export default function PageExportMenu({ pageId }: { pageId: number }) {
  const [busy, setBusy] = useState(false);

  async function exportLatex() {
    setBusy(true);
    try {
      // Read the saved snapshot rather than the live doc: it is the same
      // content the autosave just wrote, and keeps this menu independent
      // from the editor instance.
      const page = await pagesApi.get(pageId);
      downloadLatex(page.title, page.content);
      toast.success('File .tex scaricato');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Esportazione non riuscita');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Esporta pagina" disabled={busy}>
          <Download className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => window.dispatchEvent(new CustomEvent('mykhub:print'))}>
          <Printer className="mr-2 h-4 w-4" />
          Stampa o salva in PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void exportLatex()}>
          <FileCode2 className="mr-2 h-4 w-4" />
          Esporta LaTeX (.tex)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
