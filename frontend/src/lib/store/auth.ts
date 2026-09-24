import { create } from 'zustand';
import { ApiError, authApi, clearToken, getToken, setToken, usersApi } from '../api';
import type { User, UserSettings } from '../types';

/**
 * The last profile the server confirmed. It is what lets the app open at all
 * when there is no network — the token is still valid, the notes are still in
 * the browser, and being thrown back to the login screen would be both wrong
 * and, offline, a dead end.
 */
const CACHED_USER_KEY = 'mykhub_user';

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function cacheUser(user: User | null) {
  try {
    if (user) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(CACHED_USER_KEY);
  } catch {
    // Storage blocked: the app still works, it just cannot open offline.
  }
}

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'ready' | 'anonymous';
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  bootstrap: () => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',

  bootstrap: async () => {
    const token = getToken();
    if (!token) {
      set({ status: 'anonymous' });
      return;
    }
    set({ status: 'loading' });
    try {
      const user = await authApi.me();
      cacheUser(user);
      set({ user, status: 'ready' });
    } catch (error) {
      // Only the server saying "no" ends the session. Anything else — no
      // wifi, a captive portal, the box rebooting — leaves it standing.
      if (error instanceof ApiError && error.status === 401) {
        clearToken();
        cacheUser(null);
        set({ status: 'anonymous', user: null });
        return;
      }
      const cached = readCachedUser();
      set(cached ? { user: cached, status: 'ready' } : { status: 'anonymous', user: null });
    }
  },

  login: async (email, password) => {
    const res = await authApi.login(email, password);
    setToken(res.token);
    const user = { id: res.id, email: res.email, settings: res.settings, created_at: '' };
    cacheUser(user);
    set({ user, status: 'ready' });
  },

  register: async (email, password) => {
    const res = await authApi.register(email, password);
    setToken(res.token);
    const user = { id: res.id, email: res.email, settings: res.settings, created_at: '' };
    cacheUser(user);
    set({ user, status: 'ready' });
  },

  logout: () => {
    clearToken();
    cacheUser(null);
    set({ user: null, status: 'anonymous' });
  },

  updateSettings: async (patch) => {
    const { user } = get();
    if (!user) return;
    const optimistic = { ...user, settings: { ...user.settings, ...patch } };
    set({ user: optimistic });
    try {
      const res = await usersApi.patchSettings(patch);
      const saved = { ...optimistic, settings: res.settings };
      cacheUser(saved);
      set({ user: saved });
    } catch {
      set({ user });
    }
  },
}));
