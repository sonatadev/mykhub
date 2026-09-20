import { create } from 'zustand';
import { authApi, clearToken, getToken, setToken, usersApi } from '../api';
import type { User, UserSettings } from '../types';

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
      set({ user, status: 'ready' });
    } catch {
      clearToken();
      set({ status: 'anonymous', user: null });
    }
  },

  login: async (email, password) => {
    const res = await authApi.login(email, password);
    setToken(res.token);
    set({ user: { id: res.id, email: res.email, settings: res.settings, created_at: '' }, status: 'ready' });
  },

  register: async (email, password) => {
    const res = await authApi.register(email, password);
    setToken(res.token);
    set({ user: { id: res.id, email: res.email, settings: res.settings, created_at: '' }, status: 'ready' });
  },

  logout: () => {
    clearToken();
    set({ user: null, status: 'anonymous' });
  },

  updateSettings: async (patch) => {
    const { user } = get();
    if (!user) return;
    const optimistic = { ...user, settings: { ...user.settings, ...patch } };
    set({ user: optimistic });
    try {
      const res = await usersApi.patchSettings(patch);
      set({ user: { ...optimistic, settings: res.settings } });
    } catch {
      set({ user });
    }
  },
}));
