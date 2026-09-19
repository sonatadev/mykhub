import { api } from './api.js';
import { initAuth } from './auth.js';
import { initSidebar, renderSidebar, openMobileSidebar } from './sidebar.js';
import { initEditor, openPageInEditor, closePageEditor, clearEditor, focusEditor } from './editor.js';
import { initSettings, openSettingsPanel } from './settings.js';
import { showToast, showPrompt, showContextMenu } from './ui.js';

const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const sidebarEmail = document.getElementById('sidebar-email');
const emptyState = document.getElementById('empty-state');
const editorWrapper = document.getElementById('editor-wrapper');
const editorToolbar = document.getElementById('bubble-toolbar');
const pageTitle = document.getElementById('page-title');
const topbarTitle = document.getElementById('topbar-title');
const saveIndicator = document.getElementById('save-indicator');
const hamburger = document.getElementById('hamburger');
const addPageMobile = document.getElementById('btn-add-page-mobile');
const addSpaceButton = document.getElementById('btn-add-space');
const settingsButton = document.getElementById('btn-settings');

const state = {
  user: null,
  spaces: [],
  pagesBySpace: {},
  selectedSpaceId: null,
  selectedPageId: null,
  currentPage: null,
  titleTimer: null,
  savingTimer: null,
};

function showAuth() {
  authView.classList.remove('hidden');
  appView.classList.add('hidden');
}

function showApp() {
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
}

function showEmpty(message) {
  emptyState.querySelector('p').textContent = message;
  emptyState.classList.remove('hidden');
  editorWrapper.classList.add('hidden');
}

function showEditor() {
  emptyState.classList.add('hidden');
  editorWrapper.classList.remove('hidden');
}

function showSaveNotice(text, show = true) {
  saveIndicator.textContent = text;
  saveIndicator.classList.toggle('visible', show);
}

function colorIsDark(hex) {
  if (!hex || hex.length < 7) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
}

function applyTheme(settings = {}) {
  const theme = settings.theme || 'dark';
  const font = settings.font || 'inter';
  const accent = settings.accent || '#7c6af7';
  const bgColor = settings.bgColor || null;
  if (theme === 'y2k') {
    document.documentElement.dataset.theme = 'y2k';
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = bgColor ? colorIsDark(bgColor) : (theme === 'dark' || (theme === 'system' && prefersDark));
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }
  document.documentElement.dataset.font = font;
  document.documentElement.style.setProperty('--accent', accent);
  if (bgColor) {
    document.documentElement.style.setProperty('--bg-primary', bgColor);
  } else {
    document.documentElement.style.removeProperty('--bg-primary');
  }
  localStorage.setItem('mkh_settings', JSON.stringify({ theme, font, accent, bgColor }));
}

async function refreshUser() {
  if (!state.user) return;
  sidebarEmail.textContent = state.user.email;
  applyTheme(state.user.settings || {});
}

async function refreshSpaces() {
  try {
    state.spaces = await api.getSpaces();
    state.pagesBySpace = {};
    await Promise.all(state.spaces.map(async (space) => {
      state.pagesBySpace[space.id] = await api.getPages(space.id);
    }));
    if (!state.selectedSpaceId && state.spaces.length) {
      state.selectedSpaceId = state.spaces[0].id;
    }
    if (state.selectedSpaceId && !state.spaces.find(s => s.id === state.selectedSpaceId)) {
      state.selectedSpaceId = state.spaces[0]?.id ?? null;
      state.selectedPageId = null;
      state.currentPage = null;
      clearEditor();
    }
    // Try to restore the last open page
    const lastPageId = parseInt(localStorage.getItem('mkh_last_page'), 10);
    const allPages = Object.values(state.pagesBySpace).flat();
    const lastPage = lastPageId && allPages.find(p => p.id === lastPageId);
    if (lastPage) {
      state.selectedSpaceId = lastPage.space_id;
    }
    renderSidebar(state.spaces, state.pagesBySpace, state.selectedSpaceId, state.selectedPageId);
    if (lastPage) {
      await selectPage(lastPage.id);
    } else if (state.selectedSpaceId) {
      const pages = state.pagesBySpace[state.selectedSpaceId] || [];
      if (pages.length) {
        await selectPage(pages[0].id);
      } else {
        showEmpty('Crea una pagina nel tuo spazio');
      }
    } else {
      showEmpty('Crea un nuovo spazio per iniziare');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function selectSpace(spaceId) {
  state.selectedSpaceId = spaceId;
  state.selectedPageId = null;
  renderSidebar(state.spaces, state.pagesBySpace, state.selectedSpaceId, state.selectedPageId);
  const pages = state.pagesBySpace[spaceId] || [];
  if (pages.length) {
    await selectPage(pages[0].id);
  } else {
    state.currentPage = null;
    clearEditor();
    showEmpty('Crea una pagina nello spazio selezionato');
  }
}

async function selectPage(pageId) {
  localStorage.setItem('mkh_last_page', pageId);
  try {
    const page = await api.getPage(pageId);
    state.currentPage = page;
    state.selectedPageId = pageId;
    state.selectedSpaceId = page.space_id;
    renderSidebar(state.spaces, state.pagesBySpace, state.selectedSpaceId, state.selectedPageId);
    pageTitle.textContent = page.title || 'Senza titolo';
    topbarTitle.textContent = page.title || 'Pagina senza titolo';
    const space = state.spaces.find(s => s.id === page.space_id);
    const bc = document.getElementById('editor-breadcrumb');
    if (bc) {
      const allPages = state.pagesBySpace[page.space_id] || [];
      const ancestors = [];
      let cur = page;
      while (cur.parent_page_id) {
        const parent = allPages.find(p => p.id === cur.parent_page_id);
        if (!parent) break;
        ancestors.unshift(parent.title);
        cur = parent;
      }
      const parts = [space?.name, ...ancestors].filter(Boolean);
      bc.innerHTML = parts.map(p => `<span>${escapeHtml(p)}</span>`).join('<span class="editor-breadcrumb-sep"> › </span>');
    }
    showEditor();
    openPageInEditor(page.id, page.content || { type: 'doc', content: [] }, page.ydoc_state || null);
    focusEditor();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function handleEditorChange(content) {
  if (!state.currentPage) return;
  state.currentPage.content = content;
  savePage();
}

function savePage() {
  if (!state.currentPage) return;
  showSaveNotice('Salvando...');
  clearTimeout(state.savingTimer);
  state.savingTimer = setTimeout(async () => {
    try {
      const updated = await api.updatePage(state.currentPage.id, { content: state.currentPage.content });
      state.currentPage = updated;
      showSaveNotice('Salvato');
      setTimeout(() => showSaveNotice('', false), 2500);
    } catch (error) {
      showToast(error.message, 'error');
      showSaveNotice('Errore nel salvataggio');
      setTimeout(() => showSaveNotice('', false), 3000);
    }
  }, 0);
}

function scheduleTitleSave() {
  if (!state.currentPage) return;
  clearTimeout(state.titleTimer);
  state.titleTimer = setTimeout(async () => {
    const title = pageTitle.textContent.trim() || 'Senza titolo';
    try {
      const updated = await api.updatePage(state.currentPage.id, { title });
      state.currentPage = updated;
      topbarTitle.textContent = title;
      showSaveNotice('Salvato');
      setTimeout(() => showSaveNotice('', false), 1400);
      refreshSpaces();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }, 700);
}

async function handleSettingsSave(settings) {
  try {
    const result = await api.saveSettings(settings);
    state.user.settings = result.settings;
    applyTheme(result.settings);
    showToast('Impostazioni salvate', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function logout() {
  localStorage.removeItem('mkh_last_page');
  state.user = null;
  state.spaces = [];
  state.pagesBySpace = {};
  state.selectedSpaceId = null;
  state.selectedPageId = null;
  state.currentPage = null;
  api.setToken(null);
  showAuth();
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showShareModal(url, pageId, spaceId = null) {
  const existing = document.getElementById('share-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'share-modal-overlay';
  const isSpace = spaceId !== null;
  overlay.innerHTML = `
    <div class="share-modal">
      <div class="share-modal-header">
        <span class="share-modal-title">${isSpace ? 'Condividi spazio' : 'Condividi pagina'}</span>
        <button class="share-modal-close" id="share-modal-close">✕</button>
      </div>
      <p class="share-modal-desc">${isSpace
        ? 'Chiunque abbia il link può sfogliare tutte le pagine di questo spazio (senza account).'
        : 'Chiunque abbia il link può leggere questa pagina (senza account).'
      }</p>
      <div class="share-link-row">
        <input class="share-link-input" id="share-link-input" readonly value="${escapeHtml(url)}" />
        <button class="btn btn-primary btn-sm" id="share-copy-btn">Copia</button>
      </div>
      <button class="share-revoke-btn" id="share-revoke-btn">Revoca accesso</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('share-modal-close').addEventListener('click', () => overlay.remove());

  document.getElementById('share-copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('share-copy-btn');
      btn.textContent = 'Copiato!';
      setTimeout(() => { if (btn) btn.textContent = 'Copia'; }, 2000);
    });
  });

  document.getElementById('share-revoke-btn').addEventListener('click', async () => {
    try {
      if (isSpace) await api.unshareSpace(spaceId);
      else await api.unsharePage(pageId);
      overlay.remove();
      showToast('Condivisione revocata', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  });
}

function showInviteModal(space) {
  const existing = document.getElementById('invite-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'invite-modal-overlay';
  overlay.innerHTML = `
    <div class="share-modal">
      <div class="share-modal-header">
        <span class="share-modal-title">Collaboratori — ${escapeHtml(space.name)}</span>
        <button class="share-modal-close" id="invite-modal-close">✕</button>
      </div>
      <p class="share-modal-desc">Invita un utente già registrato a collaborare su questo spazio.</p>
      <div class="share-link-row">
        <input class="share-link-input" id="invite-email-input" type="email" placeholder="email@esempio.com" />
        <button class="btn btn-primary btn-sm" id="invite-send-btn">Invita</button>
      </div>
      <div id="invite-members-list" style="margin-top:12px;"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('invite-modal-close').addEventListener('click', () => overlay.remove());

  const loadMembers = async () => {
    const list = document.getElementById('invite-members-list');
    if (!list) return;
    try {
      const members = await api.getMembers(space.id);
      if (!members.length) { list.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Nessun collaboratore.</p>'; return; }
      list.innerHTML = members.map(m => `
        <div class="invite-member-row" data-uid="${m.id}">
          <span class="invite-member-email">${escapeHtml(m.email)}</span>
          <button class="btn btn-ghost btn-sm invite-remove-btn" data-uid="${m.id}">Rimuovi</button>
        </div>
      `).join('');
      list.querySelectorAll('.invite-remove-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await api.removeMember(space.id, btn.dataset.uid);
            await loadMembers();
          } catch (e) { showToast(e.message, 'error'); }
        });
      });
    } catch (e) { showToast(e.message, 'error'); }
  };

  loadMembers();

  document.getElementById('invite-send-btn').addEventListener('click', async () => {
    const email = document.getElementById('invite-email-input').value.trim();
    if (!email) return;
    try {
      await api.inviteMember(space.id, email);
      document.getElementById('invite-email-input').value = '';
      showToast('Collaboratore invitato', 'success');
      await loadMembers();
    } catch (e) { showToast(e.message, 'error'); }
  });

  document.getElementById('invite-email-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('invite-send-btn').click();
  });
}

async function start() {
  initAuth({
    onLogin: async ({ id, email, settings, token }) => {
      api.setToken(token);
      state.user = { id, email, settings };
      sidebarEmail.textContent = email;
      applyTheme(settings);
      initEditor({ onChange: handleEditorChange, user: state.user });
      await refreshSpaces();
      showApp();
    },
    onLogout: () => logout(),
  });

  initSidebar({
    onSpaceSelect: async (spaceId) => selectSpace(spaceId),
    onPageSelect: async (pageId) => selectPage(pageId),
    onRefresh: async () => refreshSpaces(),
    onShareSpace: async (space) => {
      try {
        const { token } = await api.shareSpace(space.id);
        const url = `${location.origin}/ws/${token}`;
        showShareModal(url, null, space.id);
      } catch (e) {
        showToast(e.message, 'error');
      }
    },
    onInvite: (space) => showInviteModal(space),
    onLeaveSpace: async (space) => {
      try {
        await api.leaveSpace(space.id);
        showToast('Hai lasciato lo spazio', 'success');
        await refreshSpaces();
      } catch (e) {
        showToast(e.message, 'error');
      }
    },
  });

  initSettings({ onSave: handleSettingsSave, onPreview: applyTheme, onRestore: refreshSpaces });

  addSpaceButton.addEventListener('click', () => {
    showPrompt({
      title: 'Nuovo spazio',
      placeholder: 'es. Italiano, Informatica…',
      confirmLabel: 'Crea',
      onConfirm: async (name) => {
        try {
          await api.createSpace({ name, color: '#7c6af7' });
          await refreshSpaces();
        } catch (error) {
          showToast(error.message, 'error');
        }
      },
    });
  });

  addPageMobile.addEventListener('click', (event) => {
    if (!state.selectedSpaceId) { showToast('Seleziona prima uno spazio', 'error'); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    showContextMenu(rect.left, rect.bottom + 4, [
      { label: 'Nuova nota', action: async () => {
        try { const p = await api.createPage({ space_id: state.selectedSpaceId, parent_page_id: null }); await refreshSpaces(); await selectPage(p.id); }
        catch (e) { showToast(e.message, 'error'); }
      }},
      { label: 'Nuova cartella', action: async () => {
        try { await api.createPage({ space_id: state.selectedSpaceId, parent_page_id: null, title: 'Nuova cartella' }); await refreshSpaces(); }
        catch (e) { showToast(e.message, 'error'); }
      }},
    ]);
  });

  settingsButton.addEventListener('click', () => openSettingsPanel(state.user?.settings || {}, state.user?.email || ''));
  hamburger.addEventListener('click', () => openMobileSidebar());

  document.getElementById('btn-print')?.addEventListener('click', () => window.print());

  document.getElementById('btn-share')?.addEventListener('click', async () => {
    if (!state.currentPage) return;
    try {
      const { token } = await api.sharePage(state.currentPage.id);
      const url = `${location.origin}/s/${token}`;
      showShareModal(url, state.currentPage.id);
    } catch (e) {
      showToast(e.message, 'error');
    }
  });

  pageTitle.addEventListener('input', scheduleTitleSave);
  pageTitle.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      focusEditor();
    }
  });

  authView.classList.add('hidden');
  appView.classList.add('hidden');

  const token = localStorage.getItem('mkh_token');
  if (token) {
    api.setToken(token);
    api.getMe().then((result) => {
      state.user = { id: result.id, email: result.email, settings: result.settings || {} };
      sidebarEmail.textContent = result.email;
      applyTheme(state.user.settings);
      initEditor({ onChange: handleEditorChange, user: state.user });
      refreshSpaces();
      showApp();
    }).catch(() => {
      api.setToken(null);
      showAuth();
    });
  } else {
    showAuth();
  }
}

start();
