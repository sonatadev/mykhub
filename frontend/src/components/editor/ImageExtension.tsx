import { useEffect, useRef } from 'react';
import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { AlignCenter, AlignLeft, AlignRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function ImageView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { src, alt, width, align } = node.attrs as {
    src: string;
    alt: string | null;
    width: number | null;
    align: 'left' | 'center' | 'right';
  };
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 40 && w !== width) updateAttributes({ width: w });
    });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  return (
    <NodeViewWrapper className="my-3" style={{ display: 'flex', justifyContent: justify }}>
      <div className="group relative inline-block" data-drag-handle>
        <div
          ref={wrapperRef}
          className={cn(
            'resize overflow-hidden rounded-md',
            selected && 'outline outline-2 outline-offset-2 outline-ring'
          )}
          style={{ width: width ? `${width}px` : '480px', maxWidth: '100%' }}
        >
          <img src={src} alt={alt || ''} className="block h-full w-full object-cover" draggable={false} />
        </div>
        <div
          className={cn(
            'absolute -top-9 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-border bg-popover p-0.5 shadow-md transition-opacity',
            selected ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover:opacity-100'
          )}
        >
          <button
            type="button"
            className={cn('rounded p-1 hover:bg-muted', align === 'left' && 'bg-muted')}
            onClick={() => updateAttributes({ align: 'left' })}
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={cn('rounded p-1 hover:bg-muted', align === 'center' && 'bg-muted')}
            onClick={() => updateAttributes({ align: 'center' })}
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={cn('rounded p-1 hover:bg-muted', align === 'right' && 'bg-muted')}
            onClick={() => updateAttributes({ align: 'right' })}
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>
          <div className="mx-0.5 h-4 w-px bg-border" />
          <button type="button" className="rounded p-1 text-destructive hover:bg-destructive/10" onClick={deleteNode}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      align: { default: 'center' },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});
