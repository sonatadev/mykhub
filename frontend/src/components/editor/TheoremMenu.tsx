import type { Editor } from '@tiptap/react';
import { BookMarked, Check } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { THEOREM_ORDER, THEOREM_VARIANTS } from './extensions';

export default function TheoremMenu({ editor }: { editor: Editor }) {
  const active = editor.isActive('theoremBlock');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Toggle size="sm" pressed={active} aria-label="Ambiente matematico">
          <BookMarked />
        </Toggle>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>Ambiente</DropdownMenuLabel>
        {THEOREM_ORDER.map((variant) => {
          const { label, numbered } = THEOREM_VARIANTS[variant];
          const isActive = editor.isActive('theoremBlock', { variant });
          return (
            <DropdownMenuItem
              key={variant}
              onSelect={() => editor.chain().focus().toggleTheoremBlock(variant).run()}
            >
              <span className="flex-1">{label}</span>
              {!numbered && <span className="text-xs text-muted-foreground">non num.</span>}
              {isActive && <Check className="ml-2 h-3.5 w-3.5" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!active}
          onSelect={() => editor.chain().focus().unsetTheoremBlock().run()}
        >
          Rimuovi ambiente
          <span className="ml-auto text-xs text-muted-foreground">tieni il testo</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!active}
          onSelect={() => editor.chain().focus().deleteTheoremBlock().run()}
        >
          Elimina ambiente
          <span className="ml-auto text-xs text-muted-foreground">e il testo</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
