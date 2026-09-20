import type { Theme, UserSettings } from './types';

export const ACCENT_PRESETS = [
  { label: 'Teal (default)', value: '#2F5D5A' },
  { label: 'Indaco', value: '#4F46E5' },
  { label: 'Rosso mattone', value: '#B4402E' },
  { label: 'Ambra', value: '#B9700A' },
  { label: 'Verde', value: '#2E7D4F' },
  { label: 'Grafite', value: '#57545F' },
];

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

function hexToHsl(hex: string): string | null {
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
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function resolveDark(theme: Theme | undefined): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

let mediaListenerAttached = false;

export function applyUserTheme(settings: UserSettings | undefined) {
  const root = document.documentElement;
  const isDark = resolveDark(settings?.theme);
  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme-pref', settings?.theme ?? 'system');

  if (settings?.accent) {
    const hsl = hexToHsl(settings.accent);
    if (hsl) {
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--ring', hsl);
    }
  } else {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--ring');
  }

  if (settings?.bgColor) {
    const hsl = hexToHsl(settings.bgColor);
    if (hsl) {
      root.style.setProperty('--background', hsl);
      root.style.setProperty('--sidebar', hsl);
    }
  } else {
    root.style.removeProperty('--background');
    root.style.removeProperty('--sidebar');
  }

  if (!mediaListenerAttached && (!settings?.theme || settings.theme === 'system')) {
    mediaListenerAttached = true;
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (document.documentElement.getAttribute('data-theme-pref') === 'system') {
        document.documentElement.classList.toggle('dark', e.matches);
      }
    });
  }
}
