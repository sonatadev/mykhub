import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Trash2, UserMinus } from 'lucide-react';
import type { Space, SpaceMember } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import IconPicker, { ColorField } from '@/components/IconPicker';
import { membersApi, spacesApi, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';
import { useWorkspaceStore } from '@/lib/store/workspace';
import { formatRelativeTime, initials, presenceColor } from '@/lib/utils';
import { toast } from 'sonner';

export default function SpaceSettingsDialog({
  space,
  open,
  onOpenChange,
}: {
  space: Space;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const updateSpace = useWorkspaceStore((s) => s.updateSpace);
  const deleteSpace = useWorkspaceStore((s) => s.deleteSpace);
  const removeSpaceLocal = useWorkspaceStore((s) => s.removeSpaceLocal);

  const [members, setMembers] = useState<SpaceMember[] | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(space.share_token);
  const [name, setName] = useState(space.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const isOwner = space.role === 'owner';

  useEffect(() => {
    if (open && isOwner && !members) {
      membersApi.list(space.id).then(setMembers).catch(() => setMembers([]));
    }
    if (open) {
      setName(space.name);
      setShareToken(space.share_token);
    }
  }, [open, isOwner, members, space]);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === space.name) return;
    try {
      await updateSpace(space.id, { name: trimmed });
    } catch {
      toast.error('Impossibile aggiornare il nome');
      setName(space.name);
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      const member = await membersApi.invite(space.id, inviteEmail.trim());
      setMembers((m) => [...(m || []), { ...member, created_at: new Date().toISOString() }]);
      setInviteEmail('');
      toast.success('Collaboratore invitato');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Invito non riuscito');
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(userId: number) {
    try {
      await membersApi.remove(space.id, userId);
      setMembers((m) => (m || []).filter((mm) => mm.id !== userId));
      toast.success('Collaboratore rimosso');
    } catch {
      toast.error('Impossibile rimuovere il collaboratore');
    }
  }

  async function leaveSpace() {
    try {
      await membersApi.remove(space.id, 'me');
      onOpenChange(false);
      removeSpaceLocal(space.id); // drop from local list — the server row already removed access
      navigate('/');
      toast.success('Hai lasciato lo spazio');
    } catch {
      toast.error('Impossibile lasciare lo spazio');
    }
  }

  async function toggleShare() {
    try {
      if (shareToken) {
        await spacesApi.unshare(space.id);
        setShareToken(null);
        toast.success('Condivisione revocata');
      } else {
        const { token } = await spacesApi.share(space.id);
        setShareToken(token);
      }
    } catch {
      toast.error('Operazione non riuscita');
    }
  }

  async function copyShareLink() {
    if (!shareToken) return;
    await navigator.clipboard.writeText(`${window.location.origin}/ws/${shareToken}`);
    toast.success('Link copiato negli appunti');
  }

  async function handleDeleteSpace() {
    try {
      await deleteSpace(space.id);
      onOpenChange(false);
      navigate('/');
      toast.success('Spazio eliminato');
    } catch {
      toast.error('Impossibile eliminare lo spazio');
    }
  }

  const pageCount = useWorkspaceStore((s) => s.pagesBySpace[space.id]?.length ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{space.icon}</span> {space.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={isOwner ? 'members' : 'general'}>
          <TabsList>
            <TabsTrigger value="general">Generale</TabsTrigger>
            {isOwner && <TabsTrigger value="members">Membri</TabsTrigger>}
            {isOwner && <TabsTrigger value="share">Condivisione</TabsTrigger>}
            <TabsTrigger value="danger">Zona pericolosa</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="flex flex-col gap-4">
            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Icona</Label>
                <IconPicker value={space.icon} onChange={(icon) => updateSpace(space.id, { icon })} />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} maxLength={100} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Colore</Label>
              <ColorField value={space.color} onChange={(color) => updateSpace(space.id, { color })} />
            </div>
            {!isOwner && (
              <>
                <Separator />
                <Button variant="outline" onClick={leaveSpace} className="w-fit">
                  <UserMinus className="h-4 w-4" /> Lascia questo spazio
                </Button>
              </>
            )}
          </TabsContent>

          {isOwner && (
            <TabsContent value="members" className="flex flex-col gap-4">
              <form onSubmit={invite} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@esempio.it"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
                <Button type="submit" disabled={inviting}>
                  Invita
                </Button>
              </form>
              <p className="text-xs text-muted-foreground -mt-2">
                Potrà modificare ed eliminare qualsiasi pagina in questo spazio. Solo email di account già registrati.
              </p>
              <div className="flex flex-col gap-1">
                {members === null && <p className="text-sm text-muted-foreground">Caricamento…</p>}
                {members?.length === 0 && <p className="text-sm text-muted-foreground">Nessun collaboratore.</p>}
                {members?.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-md px-1 py-1.5">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback style={{ backgroundColor: presenceColor(m.id) }}>
                        {initials(m.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{m.email}</p>
                      <p className="text-xs text-muted-foreground">invitato {formatRelativeTime(m.created_at)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Rimuovi ${m.email}`}
                      className="h-7 w-7"
                      onClick={() => removeMember(m.id)}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {isOwner && (
            <TabsContent value="share" className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Chiunque abbia il link potrà leggere l'intero spazio, incluse tutte le {pageCount}{' '}
                {pageCount === 1 ? 'pagina' : 'pagine'} che contiene — senza bisogno di un account.
              </p>
              {shareToken ? (
                <div className="flex gap-2">
                  <Input readOnly value={`${window.location.origin}/ws/${shareToken}`} className="font-mono text-xs" />
                  <Button variant="outline" size="icon" aria-label="Copia link" onClick={copyShareLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
              <Button variant={shareToken ? 'outline' : 'default'} onClick={toggleShare} className="w-fit">
                {shareToken ? 'Revoca condivisione' : 'Genera link pubblico'}
              </Button>
            </TabsContent>
          )}

          <TabsContent value="danger" className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {isOwner
                ? "Elimina definitivamente questo spazio e tutte le pagine che contiene."
                : 'Puoi lasciare questo spazio in qualsiasi momento.'}
            </p>
            {isOwner ? (
              <Button variant="destructive" onClick={() => setDeleteOpen(true)} className="w-fit">
                <Trash2 className="h-4 w-4" /> Elimina spazio
              </Button>
            ) : (
              <Button variant="destructive" onClick={leaveSpace} className="w-fit">
                <UserMinus className="h-4 w-4" /> Lascia lo spazio
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare &ldquo;{space.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Verranno eliminate tutte le pagine di questo spazio, per te e per eventuali collaboratori. Scrivi il
              nome dello spazio per confermare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={space.name}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm('')}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteConfirm !== space.name}
              onClick={handleDeleteSpace}
            >
              Elimina definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
