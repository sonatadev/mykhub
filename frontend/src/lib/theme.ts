import type { Theme, UserSettings } from './types';

// Each preset carries a hand-tuned pair: the light-mode hex is what's
// stored in settings.accent, the dark-mode hex is a lighter, same-hue
// counterpart picked for legible text/links on a near-black background —
// applying the light-mode hex verbatim in dark mode reads as low-contrast
// mud, so the two are never interchanged.
export const ACCENT_PRESETS = [
  { label: 'Teal (default)', value: '#2F5D5A', dark: '#74B9AF' },
  { label: 'Indaco', value: '#4F46E5', dark: '#8B85F0' },
  { label: 'Rosso mattone', value: '#B4402E', dark: '#E4816C' },
  { label: 'Ambra', value: '#B9700A', dark: '#DDA24B' },
  { label: 'Verde', value: '#2E7D4F', dark: '#57B57E' },
  { label: 'Grafite', value: '#57545F', dark: '#ACA9AF' },
];

// Background overrides only make sense as light "paper" tones — applied
// verbatim in dark mode they'd force a bright page behind dark-mode text
// and card colors, an unreadable combination. See applyUserTheme, which
// only honors bgColor when the resolved theme is light.
export const BG_PRESETS = [
  { label: 'Carta (default)', value: null },
  { label: 'Neve', value: '#FFFFFF' },
  { label: 'Seppia', value: '#F2E9DC' },
];

export const FONT_OPTIONS: Array<{ label: string; value: NonNullable<UserSettings['font']> }> = [
  { label: 'Sans', value: 'inter' },
  { label: 'Serif', value: 'georgia' },
  { label: 'Mono', value: 'jetbrains' },
];

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hexToHsl(hex: string): Hsl | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslString({ h, s, l }: Hsl) {
  return `${h} ${s}% ${l}%`;
}

function resolveDark(theme: Theme | undefined): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** The accent hex to actually use for the resolved theme: the stored
 * value is always the light-mode hex, so in dark mode we look up its
 * hand-tuned counterpart (falling back to the stored hex unchanged for
 * any custom/legacy value that isn't one of the known presets). */
function resolveAccentHex(stored: string, isDark: boolean): string {
  if (!isDark) return stored;
  const preset = ACCENT_PRESETS.find((p) => p.value.toLowerCase() === stored.toLowerCase());
  return preset?.dark ?? stored;
}

let mediaListenerAttached = false;
let lastSettings: UserSettings | undefined;

export function applyUserTheme(settings: UserSettings | undefined) {
  lastSettings = settings;
  const root = document.documentElement;
  const isDark = resolveDark(settings?.theme);
  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme-pref', settings?.theme ?? 'system');

  if (settings?.accent) {
    const hex = resolveAccentHex(settings.accent, isDark);
    const hsl = hexToHsl(hex);
    if (hsl) {
      root.style.setProperty('--primary', hslString(hsl));
      root.style.setProperty('--ring', hslString(hsl));
      // A soft, always-legible tint of the same hue for "selected" states
      // (active sidebar row, etc.) — derived rather than hardcoded so it
      // tracks whichever accent and theme are active.
      const tintS = Math.min(hsl.s, isDark ? 28 : 40);
      root.style.setProperty('--accent', `${hsl.h} ${tintS}% ${isDark ? 20 : 92}%`);
      root.style.setProperty('--accent-foreground', `${hsl.h} ${Math.min(hsl.s, 45)}% ${isDark ? 88 : 20}%`);
    }
  } else {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--ring');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-foreground');
  }

  // Custom paper tones are light-mode only (see BG_PRESETS comment) —
  // dark mode always keeps its own built-in background regardless of
  // this setting, so it never fights with dark-mode text/card colors.
  if (settings?.bgColor && !isDark) {
    const hsl = hexToHsl(settings.bgColor);
    if (hsl) {
      root.style.setProperty('--background', hslString(hsl));
      root.style.setProperty('--sidebar', hslString(hsl));
    }
  } else {
    root.style.removeProperty('--background');
    root.style.removeProperty('--sidebar');
  }

  if (!mediaListenerAttached) {
    mediaListenerAttached = true;
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      // Re-run the full resolution (not just the .dark class) so any
      // accent/background overrides pick up their dark- or light-mode
      // variant to match — otherwise a custom accent stays stuck on
      // whichever variant was resolved at the last explicit apply.
      if (document.documentElement.getAttribute('data-theme-pref') === 'system') {
        applyUserTheme(lastSettings);
      }
    });
  }
}
