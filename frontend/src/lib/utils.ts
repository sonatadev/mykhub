import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(email: string) {
  return email.trim().slice(0, 1).toUpperCase();
}

const PRESENCE_COLORS = [
  '#e4572e',
  '#c48a1e',
  '#4c9f70',
  '#3b82c4',
  '#7c6fd1',
  '#c4508a',
  '#3b9f98',
  '#8a8635',
];

export function presenceColor(userId: number) {
  return PRESENCE_COLORS[userId % PRESENCE_COLORS.length];
}

export function formatRelativeTime(iso: string) {
  const date = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'adesso';
  if (diffMin < 60) return `${diffMin} min fa`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} h fa`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD} g fa`;
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}
