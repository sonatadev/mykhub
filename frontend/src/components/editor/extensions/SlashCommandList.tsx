import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { SlashItem } from './slashItems';
import { cn } from '@/lib/utils';

export interface SlashListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface SlashListProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

const SlashCommandList = forwardRef<SlashListRef, SlashListProps>(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSelected(0), [items]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (items.length === 0) return false;
      if (event.key === 'ArrowDown') {
        setSelected((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowUp') {
        setSelected((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        command(items[selected]);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="w-72 rounded-xl border border-border bg-popover p-3 text-sm text-muted-foreground shadow-lg">
        Nessun blocco corrispondente
      </div>
    );
  }

  let lastGroup = '';

  return (
    <div
      ref={listRef}
      className="max-h-80 w-72 overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const header = item.group !== lastGroup ? item.group : null;
        lastGroup = item.group;
        return (
          <div key={`${item.group}-${item.title}`}>
            {header && (
              <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {header}
              </div>
            )}
            <button
              type="button"
              data-selected={index === selected}
              onMouseEnter={() => setSelected(index)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => command(item)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm',
                index === selected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.hint}</span>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
});

SlashCommandList.displayName = 'SlashCommandList';

export default SlashCommandList;
