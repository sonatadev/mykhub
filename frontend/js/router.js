import { api, showToast } from './api.js';
import { initAuth } from './auth.js';

const ROUTES = {
  '/':         () => import('./dashboard.js').then(m => m.init()),
  '/library':  () => import('./cards.js').then(m => m.init()),
  '/study':    () => import('./study.js').then(m => m.init()),
  '/exam':     () => import('./exam.js').then(m => m.init()),
  '/settings': () => import('./settings.js').then(m => m.init()),
};
const PAGE_NAMES = { '/': 'dashboard', '/library': 'library', '/study': 'study', '/exam': 'exam', '/settings': 'settings' };

let currentUser = null;

export function getUser() { return currentUser; }
export function setUser(u) { currentUser = u; }

async function navigate() {
  const authView = document.getElementById('auth-view');
  const appView  = document.getElementById('app-view');

  if (!localStorage.getItem('mk_token')) {
    authView.classList.remove('hidden');
    appView.classList.add('hidden');
    initAuth(navigate);
    return;
  }

  try {
    currentUser = await api.me();
  } catch {
    localStorage.removeItem('mk_token');
    navigate();
    return;
  }

  // Apply persisted theme
  document.documentElement.setAttribute('data-theme', currentUser.dark_mode ? 'dark' : 'light');
  document.getElementById('user-email').textContent = currentUser.email;

  authView.classList.add('hidden');
  appView.classList.remove('hidden');

  const hash = location.hash.slice(1) || '/';
  const path = hash.split('?')[0];
  const route = ROUTES[path] || ROUTES['/'];
  const pageName = PAGE_NAMES[path] || 'dashboard';

  // Highlight active nav links
  document.querySelectorAll('[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageName);
  });

  // Load page HTML fragment, then init its module
  try {
    const html = await fetch(`/pages/${pageName}.html`).then(r => r.text());
    document.getElementById('app-content').innerHTML = html;
    await route();
  } catch (err) {
    console.error(err);
    document.getElementById('app-content').innerHTML =
      `<div class="empty-state"><p class="empty-title">Errore nel caricamento</p><p class="empty-desc">${err.message}</p></div>`;
  }
}

// Sidebar toggle (mobile)
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});
document.getElementById('app-content')?.parentElement?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
});

// Close sidebar on nav click (mobile)
document.querySelectorAll('.nav-link, .bottom-nav-item').forEach(el => {
  el.addEventListener('click', () => document.getElementById('sidebar').classList.remove('open'));
});

// Theme toggle
document.getElementById('theme-toggle').addEventListener('click', async () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  try { await api.updateSettings({ dark_mode: isDark ? 0 : 1 }); } catch {}
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('mk_token');
  currentUser = null;
  navigate();
});

window.addEventListener('hashchange', navigate);
document.addEventListener('DOMContentLoaded', navigate);
