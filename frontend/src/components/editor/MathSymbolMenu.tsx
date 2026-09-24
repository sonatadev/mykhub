import type { Editor } from '@tiptap/react';
import { Sigma } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { insertSymbol, symbolGroups, symbolPreview } from '@/lib/mathSymbols';
import { renderMath } from './extensions/MathBlock';

/**
 * The toolbar's maths panel: derivatives, integrals, series and the rest,
 * shown as the symbols they are and inserted with a click. The command
 * palette searches the same catalogue for anyone who would rather type.
 */

const GROUPS = symbolGroups();

export default function MathSymbolMenu({ editor }: { editor: Editor }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Toggle
          size="sm"
          pressed={editor.isActive('mathBlock')}
          aria-label="Formule e simboli"
          title="Formule e simboli — Ctrl+Spazio per cercare"
        >
          <Sigma />
        </Toggle>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="math-symbols"
        // Radix hands focus back to the trigger when it closes, which would
        // pull it straight out of the formula this click just opened.
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DropdownMenuItem onSelect={() => editor.chain().focus().setMathBlock().run()}>
          <Sigma className="h-4 w-4" />
          <span className="flex-1">Formula vuota</span>
          <span className="text-xs text-muted-foreground">Ctrl+Shift+M</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <div className="math-symbols__scroll">
          {GROUPS.map(([group, symbols]) => (
            <div key={group}>
              <DropdownMenuLabel className="math-symbols__group">{group}</DropdownMenuLabel>
              <div className="math-symbols__grid">
                {symbols.map((symbol) => (
                  <DropdownMenuItem
                    key={symbol.latex}
                    className="math-symbols__tile"
                    title={symbol.label}
                    aria-label={symbol.label}
                    onSelect={() => insertSymbol(editor, symbol.latex)}
                  >
                    <span dangerouslySetInnerHTML={{ __html: renderMath(symbolPreview(symbol), false) }} />
                  </DropdownMenuItem>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="math-symbols__hint">Ctrl+Spazio per cercarli per nome</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
