const BASE = '/api';
const TOKEN_KEY = 'mkh_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload = {};
  try { payload = await res.json(); } catch {}
  if (!res.ok) {
    if (res.status === 401) {
      setToken(null);
    }
    throw new Error(payload.error || `Errore ${res.status}`);
  }
  return payload;
}

export const api = {
  setToken,
  getToken,
  login:       (email, password) => request('POST', '/auth/login', { email, password }),
  register:    (email, password) => request('POST', '/auth/register', { email, password }),
  getMe:       () => request('GET', '/auth/me'),
  getSpaces:   () => request('GET', '/spaces'),
  createSpace: (space) => request('POST', '/spaces', space),
  updateSpace: (id, data) => request('PATCH', `/spaces/${id}`, data),
  deleteSpace: (id) => request('DELETE', `/spaces/${id}`),
  reorderSpaces: (order) => request('POST', '/spaces/reorder', { order }),
  getPages:    (spaceId) => request('GET', `/pages?space_id=${spaceId}`),
  getPage:     (id) => request('GET', `/pages/${id}`),
  createPage:  (page) => request('POST', '/pages', page),
  updatePage:  (id, data) => request('PATCH', `/pages/${id}`, data),
  deletePage:  (id) => request('DELETE', `/pages/${id}`),
  reorderPages:(order) => request('POST', '/pages/reorder', { order }),
  saveSettings:  (settings) => request('PATCH', '/users/settings', settings),
  exportBackup:  () => request('GET', '/export/backup'),
  restoreBackup: (data) => request('POST', '/export/restore', data),
  sharePage:     (id) => request('POST', `/pages/${id}/share`),
  unsharePage:   (id) => request('DELETE', `/pages/${id}/share`),
  shareSpace:    (id) => request('POST', `/spaces/${id}/share`),
  unshareSpace:  (id) => request('DELETE', `/spaces/${id}/share`),
  getMembers:    (spaceId) => request('GET', `/collab/spaces/${spaceId}/members`),
  inviteMember:  (spaceId, email) => request('POST', `/collab/spaces/${spaceId}/members`, { email }),
  removeMember:  (spaceId, userId) => request('DELETE', `/collab/spaces/${spaceId}/members/${userId}`),
  leaveSpace:    (spaceId) => request('DELETE', `/collab/spaces/${spaceId}/members/me`),
};
