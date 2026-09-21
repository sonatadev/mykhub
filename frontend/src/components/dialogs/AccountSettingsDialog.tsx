import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/lib/store/auth';
import { ACCENT_PRESETS, BG_PRESETS, FONT_OPTIONS } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { backupApi, ApiError } from '@/lib/api';
import type { BackupPayload, ContentFont, Theme } from '@/lib/types';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AccountSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const updateSettings = useAuthStore((s) => s.updateSettings);
  const [exporting, setExporting] = useState(false);
  const [importFile, setImportFile] = useState<{ data: BackupPayload; name: string } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;
  const settings = user.settings;

  async function exportBackup() {
    setExporting(true);
    try {
      const data = await backupApi.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mykhub-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Esportazione non riuscita');
    } finally {
      setExporting(false);
    }
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as BackupPayload;
        if (!Array.isArray(data.spaces) || !Array.isArray(data.pages)) throw new Error('bad shape');
        setImportFile({ data, name: file.name });
      } catch {
        toast.error('File di backup non valido');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function confirmRestore() {
    if (!importFile) return;
    setRestoring(true);
    try {
      const res = await backupApi.restore({ spaces: importFile.data.spaces, pages: importFile.data.pages });
      toast.success(`Ripristinati ${res.spaces} spazi e ${res.pages} pagine`);
      setImportFile(null);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ripristino non riuscito');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Impostazioni account</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="appearance">
          <TabsList>
            <TabsTrigger value="appearance">Aspetto</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label>Tema</Label>
              <Select
                value={settings.theme ?? 'system'}
                onValueChange={(v) => updateSettings({ theme: v as Theme })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Chiaro</SelectItem>
                  <SelectItem value="dark">Scuro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Colore accento</Label>
              <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map((a) => (
                  <button
                    key={a.value}
                    title={a.label}
                    onClick={() => updateSettings({ accent: a.value })}
                    className={cn(
                      'h-7 w-7 rounded-full ring-offset-2 ring-offset-background transition-shadow',
                      settings.accent === a.value ? 'ring-2 ring-ring' : 'hover:ring-2 hover:ring-border'
                    )}
                    style={{ backgroundColor: a.value }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Sfondo</Label>
              <p className="text-xs text-muted-foreground">Si applica solo al tema chiaro.</p>
              <div className="flex flex-wrap gap-2">
                {BG_PRESETS.map((b) => (
                  <button
                    key={b.label}
                    onClick={() => updateSettings({ bgColor: b.value })}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs',
                      (settings.bgColor ?? null) === b.value ? 'border-ring ring-1 ring-ring' : 'border-border'
                    )}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-border/60"
                      style={{ backgroundColor: b.value ?? '#F6F5F2' }}
                    />
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Font dell'editor</Label>
              <Select
                value={settings.font ?? 'inter'}
                onValueChange={(v) => updateSettings({ font: v as ContentFont })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="backup" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">Esporta</p>
              <p className="text-xs text-muted-foreground">
                Scarica un dump completo di tutti i tuoi spazi e pagine in formato JSON.
              </p>
              <Button variant="outline" onClick={exportBackup} disabled={exporting} className="w-fit">
                <Download className="h-4 w-4" /> Esporta backup
              </Button>
            </div>
            <div className="flex flex-col gap-1.5 border-t border-border pt-4">
              <p className="text-sm font-medium">Ripristina</p>
              <p className="text-xs text-muted-foreground">
                Sostituisce interamente i tuoi spazi e pagine attuali con quelli del file selezionato.
              </p>
              <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={onFilePicked} />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-fit">
                <Upload className="h-4 w-4" /> Scegli file di backup
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="account" className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-muted-foreground">Email</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Account creato</span>
              <span>{user.created_at ? new Date(user.created_at).toLocaleDateString('it-IT') : '—'}</span>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      <AlertDialog open={!!importFile} onOpenChange={(o) => !o && setImportFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sostituire tutti i dati attuali?</AlertDialogTitle>
            <AlertDialogDescription>
              Il file &ldquo;{importFile?.name}&rdquo; contiene {importFile?.data.spaces.length} spazi e{' '}
              {importFile?.data.pages.length} pagine. Questo sostituirà interamente i tuoi spazi e pagine esistenti:
              l'operazione non è reversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={restoring} onClick={confirmRestore}>
              Sostituisci tutto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
