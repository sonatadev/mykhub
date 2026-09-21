import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ICONS, ICON_KEYS } from '@/lib/icons';
import { cn } from '@/lib/utils';

export default function IconPicker({
  value,
  onChange,
  triggerClassName,
}: {
  value: string;
  onChange: (icon: string) => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const Current = ICONS[value] ?? ICONS.folder;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            triggerClassName ??
            'flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background hover:bg-muted'
          }
          aria-label="Scegli icona"
        >
          <Current className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="grid grid-cols-6 gap-1">
          {ICON_KEYS.map((key) => {
            const Icon = ICONS[key];
            return (
              <button
                key={key}
                type="button"
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted',
                  value === key && 'bg-accent text-accent-foreground'
                )}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ColorField({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#2F5D5A'}
        onChange={(e) => {
          onChange(e.target.value);
          setText(e.target.value);
        }}
        className="h-9 w-9 cursor-pointer rounded-md border border-input bg-background p-1"
      />
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => /^#[0-9a-fA-F]{6}$/.test(text) && onChange(text)}
        className="w-28 font-mono text-xs"
        placeholder="#2F5D5A"
      />
    </div>
  );
}
