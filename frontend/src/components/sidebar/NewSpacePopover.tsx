import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import IconPicker, { ColorField } from '@/components/IconPicker';
import { useWorkspaceStore } from '@/lib/store/workspace';
import { DEFAULT_SPACE_ICON } from '@/lib/icons';
import { toast } from 'sonner';

export default function NewSpacePopover() {
  const navigate = useNavigate();
  const createSpace = useWorkspaceStore((s) => s.createSpace);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_SPACE_ICON);
  const [color, setColor] = useState('#6B4226');
  const [creating, setCreating] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const space = await createSpace({ name: name.trim(), icon, color });
      setOpen(false);
      setName('');
      setIcon(DEFAULT_SPACE_ICON);
      setColor('#6B4226');
      navigate(`/space/${space.id}`);
    } catch {
      toast.error('Impossibile creare lo spazio');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
          <Plus className="h-4 w-4" /> Nuovo spazio
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>Icona</Label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Colore</Label>
            <ColorField value={color} onChange={setColor} />
          </div>
          <Button type="submit" disabled={creating || !name.trim()}>
            Crea spazio
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
