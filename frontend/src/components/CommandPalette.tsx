import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { FileText, Search, Sigma } from 'lucide-react';
import type { MathfieldElement } from 'mathlive';
import { useWorkspaceStore } from '@/lib/store/workspace';
import { useUiStore } from '@/lib/store/ui';
import { MATH_SYMBOLS, insertSymbol, symbolPreview, type MathSymbol } from '@/lib/mathSymbols';
import { renderMath } from '@/components/editor/extensions/MathBlock';
import { activeMathfield, holdMathfield, insertLatex } from '@/lib/mathfield';
import { useRecentSymbols } from '@/lib/store/recentSymbols';
import IconGlyph from '@/components/IconGlyph';
import { cn } from '@/lib/utils';

/**
 * A quick-search overlay in the spirit of After Effects' FX Console: one
 * shortcut, a few letters, Enter. It searches two things at once — every
 * note in every space, and the maths catalogue — so a formula is a couple of
 * keystrokes away instead of a trip through a symbol grid.
 */

type Entry =
  | { kind: 'page'; id: number; title: string; icon: string; spaceId: number; spaceName: string; spaceIcon: string }
  | { kind: 'symbol'; symbol: MathSymbol };

const MAX_PER_GROUP = 8;

/** Subsequence match with a bonus for prefixes, so `int` beats `point`. */
function score(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  if (!needle) return 1;
  if (h.startsWith(needle)) return 1000 - h.length;
  const at = h.indexOf(needle);
  if (at >= 0) return 500 - at * 5 - h.length;
  let i = 0;
  for (const char of h) {
    if (char === needle[i]) i += 1;
    if (i === needle.length) return 100 - h.length;
  }
  return -1;
}

function bestScore(fields: string[], needle: string) {
  return fields.reduce((best, field) => Math.max(best, score(field, needle)), -1);
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // The formula that was being edited when the palette opened: focus has
  // moved to the search box, but that is where a symbol has to land.
  const fieldRef = useRef<MathfieldElement | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);

  const spaces = useWorkspaceStore((s) => s.spaces);
  const pagesBySpace = useWorkspaceStore((s) => s.pagesBySpace);
  const loadPages = useWorkspaceStore((s) => s.loadPages);

  useEffect(() => {
    function onKeydown(event: KeyboardEvent) {
      const mod = event.ctrlKey || event.metaKey;
      const wanted = (event.ctrlKey && event.code === 'Space') || (mod && event.shiftKey && event.key.toLowerCase() === 'k');
      if (!wanted) return;
      event.preventDefault();
      // Captured before the input steals focus.
      fieldRef.current = activeMathfield();
      releaseRef.current = holdMathfield();
      setQuery('');
      setCursor(0);
      setOpen(true);
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Every space, so "jump to any note" really means any note.
    for (const space of spaces) if (!pagesBySpace[space.id]) loadPages(space.id).catch(() => undefined);
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, spaces]);

  function close(restoreFormula: boolean) {
    setOpen(false);
    const field = fieldRef.current;
    fieldRef.current = null;
    if (restoreFormula && field?.isConnected) field.focus();
    // Released last: the field must be focused again before the formula is
    // allowed to notice that nothing else holds it open.
    window.setTimeout(() => {
      releaseRef.current?.();
      releaseRef.current = null;
    }, 0);
  }

  const inFormula = open && !!fieldRef.current;

  const results = useMemo(() => {
    if (!open) return [] as Entry[];
    const needle = query.trim().toLowerCase();

    const pages: Array<{ entry: Entry; rank: number }> = [];
    for (const space of spaces) {
      for (const page of pagesBySpace[space.id] ?? []) {
        const rank = bestScore([page.title, space.name], needle);
        if (rank < 0) continue;
        pages.push({
          rank,
          entry: {
            kind: 'page',
            id: page.id,
            title: page.title,
            icon: page.icon,
            spaceId: space.id,
            spaceName: space.name,
            spaceIcon: space.icon,
          },
        });
      }
    }

    const symbols: Array<{ entry: Entry; rank: number }> = [];
    for (const symbol of MATH_SYMBOLS) {
      const rank = bestScore([symbol.label, ...symbol.keywords], needle);
      if (rank < 0) continue;
      symbols.push({ rank, entry: { kind: 'symbol', symbol } });
    }

    const take = (items: Array<{ entry: Entry; rank: number }>) =>
      items.sort((a, b) => b.rank - a.rank).slice(0, MAX_PER_GROUP).map((i) => i.entry);

    // Writing a formula? Symbols first. Otherwise notes are what you want.
    return inFormula ? [...take(symbols), ...take(pages)] : [...take(pages), ...take(symbols)];
  }, [open, query, spaces, pagesBySpace, inFormula]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [cursor, results]);

  function run(entry: Entry) {
    if (entry.kind === 'page') {
      close(false);
      navigate(`/space/${entry.spaceId}/page/${entry.id}`);
      return;
    }
    useRecentSymbols.getState().remember(entry.symbol.latex);
    const field = fieldRef.current;
    if (field?.isConnected) {
      close(true);
      insertLatex(field, entry.symbol.latex);
      return;
    }
    // No formula open: a skeleton opens one, a glyph goes inline — either
    // way it renders, instead of sitting in the text as a backslash command.
    const editor = useUiStore.getState().activeEditor;
    close(false);
    if (editor) insertSymbol(editor, entry.symbol.latex);
  }

  if (!open) return null;

  return createPortal(
    <div
      className="command-palette"
      data-math-helper=""
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close(true);
      }}
    >
      <div className="command-palette__panel" role="dialog" aria-modal="true" aria-label="Cerca">
        <div className="command-palette__search">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={inFormula ? 'Cerca un simbolo o una nota…' : 'Vai a una nota, o cerca un simbolo…'}
            className="command-palette__input"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                close(true);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((c) => (results.length ? (c + 1) % results.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((c) => (results.length ? (c - 1 + results.length) % results.length : 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const entry = results[cursor];
                if (entry) run(entry);
              }
            }}
          />
          <kbd className="command-palette__kbd">esc</kbd>
        </div>

        <div ref={listRef} className="command-palette__list">
          {results.length === 0 && <p className="command-palette__empty">Nessun risultato</p>}
          {results.map((entry, index) => {
            const key = entry.kind === 'page' ? `p${entry.id}` : `s${entry.symbol.latex}`;
            return (
              <button
                key={key}
                type="button"
                data-active={index === cursor}
                className={cn('command-palette__item', index === cursor && 'command-palette__item--active')}
                onMouseEnter={() => setCursor(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => run(entry)}
              >
                {entry.kind === 'page' ? (
                  <>
                    <span className="command-palette__icon">
                      <IconGlyph value={entry.icon} kind="page" />
                    </span>
                    <span className="command-palette__label">{entry.title || 'Senza titolo'}</span>
                    <span className="command-palette__meta">
                      <IconGlyph value={entry.spaceIcon} kind="space" /> {entry.spaceName}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className="command-palette__icon command-palette__preview"
                      dangerouslySetInnerHTML={{ __html: renderMath(symbolPreview(entry.symbol), false) }}
                    />
                    <span className="command-palette__label">{entry.symbol.label}</span>
                    <span className="command-palette__meta">{entry.symbol.group}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="command-palette__footer">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" /> note
          </span>
          <span className="flex items-center gap-1">
            <Sigma className="h-3 w-3" /> simboli
          </span>
          <span className="ml-auto">↑↓ scorri · ⏎ apri</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
