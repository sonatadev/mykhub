import { useState } from 'react';
import { Table2 } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Toggle } from '@/components/ui/toggle';

export default function TableGridPopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState({ rows: 0, cols: 0 });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Toggle size="sm" aria-label="Inserisci tabella">
          <Table2 />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">
        <p className="mb-2 text-xs text-muted-foreground">
          {hover.rows > 0 ? `${hover.rows} × ${hover.cols}` : 'Scegli le dimensioni'}
        </p>
        <div className="grid grid-cols-6 gap-1" onMouseLeave={() => setHover({ rows: 0, cols: 0 })}>
          {Array.from({ length: 30 }).map((_, i) => {
            const row = Math.floor(i / 6) + 1;
            const col = (i % 6) + 1;
            const active = row <= hover.rows && col <= hover.cols;
            return (
              <button
                key={i}
                type="button"
                className={`h-5 w-5 rounded-sm border ${active ? 'border-primary bg-primary/20' : 'border-border'}`}
                onMouseEnter={() => setHover({ rows: row, cols: col })}
                onClick={() => {
                  editor.chain().focus().insertTable({ rows: row, cols: col, withHeaderRow: true }).run();
                  setOpen(false);
                }}
              />
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
