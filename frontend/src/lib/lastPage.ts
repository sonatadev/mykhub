/**
 * Remembers which page each account had open last, so a fresh visit reopens
 * that note instead of falling back to the first one in the sidebar.
 *
 * Lives in localStorage rather than in the user settings: it is a per-device
 * convenience, and it must be readable synchronously during the very first
 * render to avoid a visible redirect through the wrong page.
 */

interface LastPageState {
  /** Space whose page was open most recently. */
  spaceId: number | null;
  /** Last page opened inside each space, so switching back restores it. */
  bySpace: Record<number, number>;
}

const EMPTY: LastPageState = { spaceId: null, bySpace: {} };

function key(userId: number) {
  return `mykhub:last-page:${userId}`;
}

function read(userId: number): LastPageState {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<LastPageState>;
    const spaceId = typeof parsed.spaceId === 'number' ? parsed.spaceId : null;
    const bySpace: Record<number, number> = {};
    for (const [space, page] of Object.entries(parsed.bySpace ?? {})) {
      if (typeof page === 'number' && Number.isFinite(Number(space))) bySpace[Number(space)] = page;
    }
    return { spaceId, bySpace };
  } catch {
    // Private mode, cleared storage or a value written by an older build.
    return EMPTY;
  }
}

function write(userId: number, state: LastPageState) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(state));
  } catch {
    // Storage full or blocked: remembering the page is optional.
  }
}

/** Records the page the user is looking at right now. */
export function rememberPage(userId: number, spaceId: number, pageId: number) {
  const state = read(userId);
  if (state.spaceId === spaceId && state.bySpace[spaceId] === pageId) return;
  write(userId, { spaceId, bySpace: { ...state.bySpace, [spaceId]: pageId } });
}

/** The space to reopen on a bare `/`, or null when nothing is remembered. */
export function lastSpaceId(userId: number): number | null {
  return read(userId).spaceId;
}

/** The page to reopen inside `spaceId`, or null when nothing is remembered. */
export function lastPageInSpace(userId: number, spaceId: number): number | null {
  return read(userId).bySpace[spaceId] ?? null;
}

/** Drops a remembered page that no longer exists, so the next visit falls
 *  back to the sidebar instead of reopening a dead note. */
export function forgetPage(userId: number, spaceId: number, pageId: number) {
  const state = read(userId);
  if (state.bySpace[spaceId] !== pageId) return;
  const bySpace = { ...state.bySpace };
  delete bySpace[spaceId];
  write(userId, { spaceId: state.spaceId, bySpace });
}
