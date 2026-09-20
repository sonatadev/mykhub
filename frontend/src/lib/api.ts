import type {
  BackupPayload,
  PageFull,
  PageSummary,
  PublicPage,
  PublicSpaceData,
  Space,
  SpaceMember,
  User,
  UserSettings,
} from './types';

const TOKEN_KEY = 'mykhub_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, { ...init, headers });

  if (res.status === 401 && onUnauthorized) onUnauthorized();

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error || `Errore ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

function json(body: unknown) {
  return JSON.stringify(body);
}

// ── Auth ────────────────────────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string) =>
    request<{ token: string; id: number; email: string; settings: UserSettings }>('/auth/register', {
      method: 'POST',
      body: json({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; id: number; email: string; settings: UserSettings }>('/auth/login', {
      method: 'POST',
      body: json({ email, password }),
    }),
  me: () => request<User>('/auth/me'),
};

// ── Users / settings ───────────────────────────────────────────────────
export const usersApi = {
  patchSettings: (patch: Partial<UserSettings>) =>
    request<{ settings: UserSettings }>('/users/settings', { method: 'PATCH', body: json(patch) }),
};

// ── Spaces ─────────────────────────────────────────────────────────────
export const spacesApi = {
  list: () => request<Space[]>('/spaces'),
  create: (data: { name: string; icon?: string; color?: string }) =>
    request<Space>('/spaces', { method: 'POST', body: json(data) }),
  update: (id: number, patch: Partial<{ name: string; icon: string; color: string; order_index: number }>) =>
    request<Space>(`/spaces/${id}`, { method: 'PATCH', body: json(patch) }),
  remove: (id: number) => request<{ ok: true }>(`/spaces/${id}`, { method: 'DELETE' }),
  reorder: (order: Array<{ id: number; order_index: number }>) =>
    request<{ ok: true }>('/spaces/reorder', { method: 'POST', body: json({ order }) }),
  share: (id: number) => request<{ token: string }>(`/spaces/${id}/share`, { method: 'POST' }),
  unshare: (id: number) => request<{ ok: true }>(`/spaces/${id}/share`, { method: 'DELETE' }),
};

// ── Pages ──────────────────────────────────────────────────────────────
export const pagesApi = {
  list: (spaceId: number) => request<PageSummary[]>(`/pages?space_id=${spaceId}`),
  get: (id: number) => request<PageFull>(`/pages/${id}`),
  create: (data: { space_id: number; parent_page_id?: number | null; title?: string; icon?: string }) =>
    request<PageFull>('/pages', { method: 'POST', body: json(data) }),
  update: (id: number, patch: Partial<{ title: string; content: unknown; icon: string; order_index: number }>) =>
    request<PageFull>(`/pages/${id}`, { method: 'PATCH', body: json(patch) }),
  remove: (id: number) => request<{ ok: true }>(`/pages/${id}`, { method: 'DELETE' }),
  reorder: (order: Array<{ id: number; order_index: number; parent_page_id?: number | null }>) =>
    request<{ ok: true }>('/pages/reorder', { method: 'POST', body: json({ order }) }),
  share: (id: number) => request<{ token: string }>(`/pages/${id}/share`, { method: 'POST' }),
  unshare: (id: number) => request<{ ok: true }>(`/pages/${id}/share`, { method: 'DELETE' }),
};

// ── Collaborators ──────────────────────────────────────────────────────
export const membersApi = {
  list: (spaceId: number) => request<SpaceMember[]>(`/collab/spaces/${spaceId}/members`),
  invite: (spaceId: number, email: string) =>
    request<SpaceMember>(`/collab/spaces/${spaceId}/members`, { method: 'POST', body: json({ email }) }),
  remove: (spaceId: number, userId: number | 'me') =>
    request<{ ok: true }>(`/collab/spaces/${spaceId}/members/${userId}`, { method: 'DELETE' }),
};

// ── Public (no auth) ───────────────────────────────────────────────────
export const publicApi = {
  page: async (token: string): Promise<PublicPage> => {
    const res = await fetch(`/api/public/${token}`);
    const data = await res.json();
    if (!res.ok) throw new ApiError(res.status, data.error || 'Errore');
    return data;
  },
  space: async (token: string): Promise<PublicSpaceData> => {
    const res = await fetch(`/api/public/space/${token}`);
    const data = await res.json();
    if (!res.ok) throw new ApiError(res.status, data.error || 'Errore');
    return data;
  },
};

// ── Upload ─────────────────────────────────────────────────────────────
export const uploadApi = {
  image: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    return request('/upload', { method: 'POST', body: form });
  },
};

// ── Backup / restore ───────────────────────────────────────────────────
export const backupApi = {
  export: () => request<BackupPayload>('/export/backup'),
  restore: (payload: { spaces: BackupPayload['spaces']; pages: BackupPayload['pages'] }) =>
    request<{ ok: true; spaces: number; pages: number }>('/export/restore', {
      method: 'POST',
      body: json(payload),
    }),
};
