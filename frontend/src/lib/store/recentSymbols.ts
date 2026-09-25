import { create } from 'zustand';
import { MATH_SYMBOLS, type MathSymbol } from '@/lib/mathSymbols';

/**
 * The symbols this person reaches for, most recent first. It is what the side
 * panel shows, so the ten symbols a lecture actually needs are one click away
 * instead of a trip back through the menu.
 */

const KEY = 'mykhub:recent-symbols';
const LIMIT = 18;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string').slice(0, LIMIT) : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage blocked: the panel just forgets between sessions.
  }
}

interface RecentState {
  recent: string[];
  remember: (latex: string) => void;
  forgetAll: () => void;
}

export const useRecentSymbols = create<RecentState>((set, get) => ({
  recent: read(),
  remember: (latex) => {
    const next = [latex, ...get().recent.filter((item) => item !== latex)].slice(0, LIMIT);
    write(next);
    set({ recent: next });
  },
  forgetAll: () => {
    write([]);
    set({ recent: [] });
  },
}));

/** The catalogue entry for a remembered symbol, for its label and preview. */
export function symbolFor(latex: string): MathSymbol | undefined {
  return MATH_SYMBOLS.find((symbol) => symbol.latex === latex);
}
