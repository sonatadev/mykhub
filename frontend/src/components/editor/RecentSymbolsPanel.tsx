import type { Editor } from '@tiptap/react';
import { Clock } from 'lucide-react';
import { useRecentSymbols, symbolFor } from '@/lib/store/recentSymbols';
import { insertSymbol, symbolPreview } from '@/lib/mathSymbols';
import { activeMathfield, insertLatex } from '@/lib/mathfield';
import { renderMath } from './extensions/MathBlock';

/**
 * A column of the symbols used most recently, down the side of the page. It
 * saves reopening the panel for the handful of symbols a given lecture keeps
 * needing — and it puts them into the formula being written, if there is one.
 */
export default function RecentSymbolsPanel({ editor }: { editor: Editor }) {
  const recent = useRecentSymbols((state) => state.recent);
  const remember = useRecentSymbols((state) => state.remember);

  if (recent.length === 0) return null;

  function pick(latex: string) {
    const field = activeMathfield();
    remember(latex);
    if (field?.isConnected) insertLatex(field, latex);
    else insertSymbol(editor, latex);
  }

  return (
    <aside className="recent-symbols print:hidden" aria-label="Simboli recenti">
      <div className="recent-symbols__title">
        <Clock className="h-3 w-3" /> recenti
      </div>
      <div className="recent-symbols__grid">
        {recent.map((latex) => {
          const symbol = symbolFor(latex);
          return (
            <button
              key={latex}
              type="button"
              className="recent-symbols__tile"
              title={symbol?.label ?? latex}
              aria-label={symbol?.label ?? latex}
              // Keep the caret where it is: the formula must not lose focus.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(latex)}
              dangerouslySetInnerHTML={{
                __html: renderMath(symbol ? symbolPreview(symbol) : latex, false),
              }}
            />
          );
        })}
      </div>
    </aside>
  );
}
