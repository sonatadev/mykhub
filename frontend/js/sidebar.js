import { api } from './api.js';
import { showToast, showPrompt, showConfirm, showContextMenu } from './ui.js';

const Sortable = window.SortableLib?.Sortable || window.Sortable || window.SortableLib;

const callbacks = {
  onSpaceSelect: null,
  onPageSelect: null,
  onRefresh: null,
  onInvite: null,
  onLeaveSpace: null,
};

let isRenaming = false; // guard: block renderSidebar while an inline rename is active
let isMoveMode = localStorage.getItem('mkh_movemode') === '1';
let sortableInstances = [];

const SVG_CHEVRON = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 2L7 5L3 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const SVG_EXPAND_ALL   = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3.5L5.5 1L10 3.5"/><path d="M1 7.5L5.5 10L10 7.5"/></svg>`;
const SVG_COLLAPSE_ALL = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1L5.5 3.5L10 1"/><path d="M1 10L5.5 7.5L10 10"/></svg>`;

const SVG_FOLDER = (color) => `<svg class="sidebar-icon" width="14" height="14" viewBox="0 0 16 16" fill="${color || 'currentColor'}" xmlns="http://www.w3.org/2000/svg" style="opacity:0.85"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.086a1.5 1.5 0 0 1 1.06.44l.915.915A1.5 1.5 0 0 0 8.621 4H13.5A1.5 1.5 0 0 1 15 5.5v7A1.5 1.5 0 0 1 13.5 14h-11A1.5 1.5 0 0 1 1 12.5v-9z"/></svg>`;

const SVG_PAGE = `<svg class="sidebar-icon" width="13" height="13" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;opacity:0.55"><path d="M4 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5.414A2 2 0 0 0 13.414 4L11 1.586A2 2 0 0 0 9.586 1H4zm4 0v3a1 1 0 0 0 1 1h3M4.5 8h7M4.5 10.5h7M4.5 13h4"/><path d="M10 1v3a1 1 0 0 0 1 1h3" stroke="currentColor" stroke-width="0.5" fill="none"/><line x1="4.5" y1="8" x2="11.5" y2="8" stroke="currentColor" stroke-width="0.8" opacity="0.7"/><line x1="4.5" y1="10.5" x2="11.5" y2="10.5" stroke="currentColor" stroke-width="0.8" opacity="0.7"/><line x1="4.5" y1="13" x2="8.5" y2="13" stroke="currentColor" stroke-width="0.8" opacity="0.7"/></svg>`;

const SIDEBAR_W_KEY = 'mkh_sidebar_w';
const SIDEBAR_MIN_W = 180;
const SIDEBAR_MAX_W = 520;

export function initSidebar(options = {}) {
  Object.assign(callbacks, options);
  document.getElementById('sidebar-overlay').addEventListener('click', closeMobileSidebar);
  document.addEventListener('click', () => closeContextMenu());

  const searchInput = document.getElementById('sidebar-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterSidebar(searchInput.value.toLowerCase().trim());
    });
  }

  document.getElementById('btn-toggle-all')?.addEventListener('click', toggleAllSpaces);

  // Sidebar collapse (desktop)
  const collapseBtn  = document.getElementById('sidebar-collapse-btn');
  const expandStrip  = document.getElementById('sidebar-expand-strip');
  const appView      = document.getElementById('app-view');
  if (localStorage.getItem('mkh_sidebar_collapsed') === '1') appView.classList.add('sidebar-collapsed');
  collapseBtn?.addEventListener('click', () => {
    appView.classList.add('sidebar-collapsed');
    localStorage.setItem('mkh_sidebar_collapsed', '1');
  });
  expandStrip?.addEventListener('click', () => {
    appView.classList.remove('sidebar-collapsed');
    localStorage.setItem('mkh_sidebar_collapsed', '0');
  });

  // Move mode toggle
  const moveModeBtn = document.getElementById('btn-move-mode');
  applyMoveMode(isMoveMode);
  moveModeBtn?.addEventListener('click', () => {
    isMoveMode = !isMoveMode;
    localStorage.setItem('mkh_movemode', isMoveMode ? '1' : '0');
    applyMoveMode(isMoveMode);
  });

  initResizeHandle();
}

function applyMoveMode(enabled) {
  document.body.classList.toggle('mkh-movemode', enabled);
  document.getElementById('btn-move-mode')?.classList.toggle('move-mode-active', enabled);
  sortableInstances.forEach(s => s.option('disabled', !enabled));
}

function allSpacesOpen() {
  const spaces = document.querySelectorAll('.space-item');
  return spaces.length > 0 && Array.from(spaces).every(s => s.classList.contains('open'));
}

function updateToggleAllBtn() {
  const btn = document.getElementById('btn-toggle-all');
  if (!btn) return;
  const expanded = allSpacesOpen();
  btn.title = expanded ? 'Comprimi tutto' : 'Espandi tutto';
  btn.innerHTML = expanded ? SVG_COLLAPSE_ALL : SVG_EXPAND_ALL;
}

function toggleAllSpaces() {
  const spaces = document.querySelectorAll('.space-item');
  const expand = !allSpacesOpen();

  spaces.forEach(item => {
    item.classList.toggle('open', expand);
    const spaceId = item.dataset.spaceId;
    if (spaceId) setExpanded('space', spaceId, expand);
  });

  document.querySelectorAll('.page-item.has-children').forEach(item => {
    item.classList.toggle('open', expand);
    const pageId = item.dataset.pageId;
    if (pageId) setExpanded('page', pageId, expand);
  });

  updateToggleAllBtn();
}

function initResizeHandle() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Restore saved width
  const saved = parseInt(localStorage.getItem(SIDEBAR_W_KEY));
  if (saved >= SIDEBAR_MIN_W && saved <= SIDEBAR_MAX_W) {
    sidebar.style.width = saved + 'px';
  }

  const handle = document.createElement('div');
  handle.className = 'sidebar-resize-handle';
  sidebar.appendChild(handle);

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebar.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMove(e) {
      const w = Math.min(SIDEBAR_MAX_W, Math.max(SIDEBAR_MIN_W, startW + e.clientX - startX));
      sidebar.style.width = w + 'px';
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem(SIDEBAR_W_KEY, sidebar.offsetWidth);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

export function renderSidebar(spaces = [], pagesBySpace = {}, selectedSpaceId = null, selectedPageId = null) {
  sortableInstances.forEach(s => { try { s.destroy(); } catch (_) {} });
  sortableInstances = [];

  const body = document.getElementById('sidebar-body');
  body.innerHTML = '';

  const ownSpaces    = spaces.filter(s => s.role !== 'member');
  const sharedSpaces = spaces.filter(s => s.role === 'member');

  const spaceList = document.createElement('div');
  spaceList.id = 'space-list';
  body.appendChild(spaceList);

  ownSpaces.forEach(space => {
    spaceList.appendChild(buildSpaceItem(space, pagesBySpace[space.id] || [], selectedSpaceId, selectedPageId));
  });

  attachSpaceSorter(spaceList);

  if (sharedSpaces.length > 0) {
    const sep = document.createElement('div');
    sep.className = 'sidebar-section-label';
    sep.textContent = 'Condivisi con me';
    body.appendChild(sep);

    const sharedList = document.createElement('div');
    sharedList.id = 'shared-space-list';
    body.appendChild(sharedList);
    sharedSpaces.forEach(space => {
      sharedList.appendChild(buildSpaceItem(space, pagesBySpace[space.id] || [], selectedSpaceId, selectedPageId));
    });
  }

  // Re-apply search filter after render
  const searchInput = document.getElementById('sidebar-search');
  if (searchInput?.value) filterSidebar(searchInput.value.toLowerCase().trim());

  updateToggleAllBtn();
}

function buildSpaceItem(space, pages, selectedSpaceId, selectedPageId) {
  const container = document.createElement('div');
  container.className = 'space-item';
  if (getExpanded('space', space.id) || space.id === selectedSpaceId) container.classList.add('open');
  container.dataset.spaceId = space.id;

  const header = document.createElement('div');
  header.className = 'space-header';
  header.innerHTML = `
    <button class="space-toggle" title="Espandi">${SVG_CHEVRON}</button>
    ${SVG_FOLDER(space.color || 'var(--accent)')}
    <span class="space-name">${escapeHtml(space.name)}</span>
    <div class="space-actions">
      <button class="btn-icon" data-action="add-page" title="Nuova pagina">+</button>
      <button class="btn-icon" data-action="ctx" title="Opzioni"><svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="13" cy="8" r="1.2"/></svg></button>
    </div>
  `;

  // Chevron: toggle open/close without changing selection
  header.querySelector('.space-toggle').addEventListener('click', (event) => {
    event.stopPropagation();
    const nowOpen = container.classList.toggle('open');
    setExpanded('space', space.id, nowOpen);
  });

  // Header body: select space and ensure it's open
  header.addEventListener('click', () => {
    callbacks.onSpaceSelect?.(space.id);
    container.classList.add('open');
    setExpanded('space', space.id, true);
  });

  header.querySelector('.space-name').addEventListener('dblclick', (event) => {
    event.stopPropagation();
    startInlineRename(header.querySelector('.space-name'), async (name) => {
      await api.updateSpace(space.id, { name });
      callbacks.onRefresh?.();
    });
  });

  header.querySelector('[data-action="add-page"]').addEventListener('click', (event) => {
    showCreateMenu(event, space.id, null);
  });

  header.querySelector('[data-action="ctx"]').addEventListener('click', (event) => {
    event.stopPropagation();
    showSpaceMenu(event, space);
  });

  header.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    showSpaceMenu(event, space);
  });

  container.appendChild(header);

  const pageContainer = document.createElement('div');
  pageContainer.className = 'space-pages';
  pageContainer.dataset.spaceId = space.id;

  const rootPages = pages.filter(page => !page.parent_page_id).sort((a, b) => a.order_index - b.order_index || a.id - b.id);
  rootPages.forEach(page => pageContainer.appendChild(buildPageItem(page, pages, space, 0, selectedPageId)));

  attachPageSorter(pageContainer, space.id);
  container.appendChild(pageContainer);
  return container;
}

function buildPageItem(page, allPages, space, depth, selectedPageId) {
  const children = allPages.filter(item => item.parent_page_id === page.id).sort((a, b) => a.order_index - b.order_index || a.id - b.id);
  const isFolder = page.icon === 'folder' || children.length > 0;

  const item = document.createElement('div');
  item.className = 'page-item';
  if (isFolder) item.classList.add('is-folder');
  if (children.length) item.classList.add('has-children');
  if (getExpanded('page', page.id)) item.classList.add('open');
  item.dataset.pageId = page.id;

  const row = document.createElement('div');
  row.className = 'page-row';
  if (isFolder) row.classList.add('page-row-folder');
  row.dataset.pageId = page.id;
  row.style.paddingLeft = '6px';

  row.innerHTML = `
    <button class="page-toggle" title="Espandi">${SVG_CHEVRON}</button>
    ${isFolder ? SVG_FOLDER(space.color || 'var(--accent)') : SVG_PAGE}
    <span class="page-title">${escapeHtml(page.title || 'Senza titolo')}</span>
    <div class="page-actions">
      ${depth < 3 ? '<button class="btn-icon" data-action="add-child" title="Aggiungi">+</button>' : ''}
      <button class="btn-icon" data-action="ctx" title="Opzioni"><svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="13" cy="8" r="1.2"/></svg></button>
    </div>
  `;

  if (page.id === selectedPageId) row.classList.add('active');

  const toggle = row.querySelector('.page-toggle');
  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    item.classList.toggle('open');
    setExpanded('page', page.id, item.classList.contains('open'));
  });

  row.querySelector('[data-action="ctx"]').addEventListener('click', (event) => {
    event.stopPropagation();
    showPageMenu(event, page, space);
  });

  const childButton = row.querySelector('[data-action="add-child"]');
  if (childButton) {
    childButton.addEventListener('click', (event) => {
      showCreateMenu(event, space.id, page.id);
    });
  }

  let titleClickTimer = null;
  row.querySelector('.page-title').addEventListener('click', (event) => {
    event.stopPropagation();
    clearTimeout(titleClickTimer);
    titleClickTimer = setTimeout(() => {
      callbacks.onPageSelect?.(page.id);
      closeMobileSidebar();
    }, 220);
  });

  row.querySelector('.page-title').addEventListener('dblclick', (event) => {
    event.stopPropagation();
    clearTimeout(titleClickTimer);
    startInlineRename(row.querySelector('.page-title'), async (title) => {
      await api.updatePage(page.id, { title });
      callbacks.onRefresh?.();
    });
  });

  row.addEventListener('click', () => {
    if (isFolder) {
      item.classList.toggle('open');
      setExpanded('page', page.id, item.classList.contains('open'));
    } else {
      callbacks.onPageSelect?.(page.id);
      closeMobileSidebar();
    }
  });

  row.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    showPageMenu(event, page, space);
  });

  // Auto-expand when a drag hovers over this row for 700ms
  if (depth < 3) {
    let expandTimer = null;
    row.addEventListener('dragenter', () => {
      clearTimeout(expandTimer);
      expandTimer = setTimeout(() => {
        expandTimer = null;
        item.classList.add('open');
        setExpanded('page', page.id, true);
      }, 700);
    });
    row.addEventListener('dragleave', (e) => {
      if (!row.contains(e.relatedTarget)) clearTimeout(expandTimer);
    });
    row.addEventListener('drop', () => clearTimeout(expandTimer));
  }

  item.appendChild(row);

  // Always create a children container for pages that can have children,
  // even when empty — this makes them valid drop targets for nesting.
  if (depth < 3) {
    const childList = document.createElement('div');
    childList.className = 'page-children';
    childList.dataset.spaceId = space.id;
    childList.dataset.pageId = page.id;
    children.forEach(child => childList.appendChild(buildPageItem(child, allPages, space, depth + 1, selectedPageId)));
    attachPageSorter(childList, space.id);
    item.appendChild(childList);
  }

  return item;
}

function filterSidebar(query) {
  if (!query) {
    document.querySelectorAll('.page-item').forEach(item => { item.style.display = ''; });
    document.querySelectorAll('.space-item').forEach(item => { item.style.display = ''; });
    return;
  }
  document.querySelectorAll('.page-item').forEach(item => {
    const title = item.querySelector('.page-title')?.textContent?.toLowerCase() || '';
    item.style.display = title.includes(query) ? '' : 'none';
  });
  document.querySelectorAll('.space-item').forEach(space => {
    const hasVisible = Array.from(space.querySelectorAll('.page-item')).some(p => p.style.display !== 'none');
    space.style.display = hasVisible ? '' : 'none';
    if (hasVisible) space.classList.add('open');
  });
}

function showSpaceMenu(event, space) {
  if (space.role === 'member') {
    showContextMenu(event.clientX, event.clientY, [
      { label: 'Lascia spazio', danger: true, action: () => callbacks.onLeaveSpace?.(space) },
    ]);
    return;
  }
  showContextMenu(event.clientX, event.clientY, [
    { label: 'Rinomina', action: () => renameSpace(space) },
    { label: 'Cambia colore', action: () => changeSpaceColor(space) },
    'sep',
    { label: 'Invita collaboratori', action: () => callbacks.onInvite?.(space) },
    { label: 'Condividi spazio', action: () => callbacks.onShareSpace?.(space) },
    'sep',
    { label: 'Elimina spazio', danger: true, action: () => deleteSpace(space) },
  ]);
}

function showPageMenu(event, page, space) {
  showContextMenu(event.clientX, event.clientY, [
    { label: 'Rinomina', action: () => renamePage(page) },
    'sep',
    { label: 'Elimina pagina', danger: true, action: () => deletePage(page) },
  ]);
}

async function createPage(spaceId, parentPageId, { folder = false } = {}) {
  try {
    const payload = { space_id: spaceId, parent_page_id: parentPageId };
    if (folder) { payload.title = 'Nuova cartella'; payload.icon = 'folder'; }
    const page = await api.createPage(payload);
    await callbacks.onRefresh?.();
    if (!folder) callbacks.onPageSelect?.(page.id);
    if (folder) {
      // Auto-start inline rename on the newly created folder
      const row = document.querySelector(`[data-page-id="${page.id}"] .page-title`);
      if (row) startInlineRename(row, async (title) => {
        await api.updatePage(page.id, { title });
        callbacks.onRefresh?.();
      });
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function showCreateMenu(event, spaceId, parentPageId) {
  event.stopPropagation();
  const rect = event.currentTarget.getBoundingClientRect();
  showContextMenu(rect.left, rect.bottom + 4, [
    { label: 'Nuova nota',     action: () => createPage(spaceId, parentPageId, { folder: false }) },
    { label: 'Nuova cartella', action: () => createPage(spaceId, parentPageId, { folder: true  }) },
  ]);
}

function renameSpace(space) {
  showPrompt({
    title: 'Rinomina spazio',
    placeholder: 'Nome spazio',
    value: space.name,
    confirmLabel: 'Salva',
    onConfirm: async (name) => {
      try {
        await api.updateSpace(space.id, { name });
        callbacks.onRefresh?.();
      } catch (error) {
        showToast(error.message, 'error');
      }
    },
  });
}

function changeSpaceColor(space) {
  const input = document.createElement('input');
  input.type = 'color';
  input.value = space.color || '#7c6af7';
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  input.click();
  input.addEventListener('input', async () => {
    try {
      await api.updateSpace(space.id, { color: input.value });
      callbacks.onRefresh?.();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  input.addEventListener('blur', () => input.remove());
}

function deleteSpace(space) {
  showConfirm({
    title: 'Elimina spazio',
    message: `Eliminare "${space.name}" e tutte le pagine al suo interno? Questa operazione non può essere annullata.`,
    confirmLabel: 'Elimina',
    onConfirm: async () => {
      try {
        await api.deleteSpace(space.id);
        callbacks.onRefresh?.();
      } catch (error) {
        showToast(error.message, 'error');
      }
    },
  });
}

function renamePage(page) {
  showPrompt({
    title: 'Rinomina pagina',
    placeholder: 'Titolo pagina',
    value: page.title,
    confirmLabel: 'Salva',
    onConfirm: async (title) => {
      try {
        await api.updatePage(page.id, { title });
        callbacks.onRefresh?.();
      } catch (error) {
        showToast(error.message, 'error');
      }
    },
  });
}

function deletePage(page) {
  showConfirm({
    title: 'Elimina pagina',
    message: `Eliminare "${page.title || 'Senza titolo'}" e tutte le sotto-pagine? Questa operazione non può essere annullata.`,
    confirmLabel: 'Elimina',
    onConfirm: async () => {
      try {
        await api.deletePage(page.id);
        callbacks.onRefresh?.();
      } catch (error) {
        showToast(error.message, 'error');
      }
    },
  });
}

function attachSpaceSorter(container) {
  const sorter = new Sortable(container, {
    animation: 150,
    handle: '.space-header',
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    disabled: !isMoveMode,
    onEnd: async () => {
      const order = Array.from(container.querySelectorAll(':scope > .space-item')).map((item, index) => ({
        id: Number(item.dataset.spaceId),
        order_index: index,
      }));
      try {
        await api.reorderSpaces(order);
      } catch (error) {
        showToast('Impossibile riordinare gli spazi', 'error');
      }
    },
  });
  sortableInstances.push(sorter);
  return sorter;
}

function attachPageSorter(container, spaceId) {
  const sorter = new Sortable(container, {
    animation: 150,
    group: { name: `pages-${spaceId}`, pull: true, put: true },
    handle: '.page-row',
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    disabled: !isMoveMode,
    onStart: () => document.body.classList.add('mkh-dragging'),
    onEnd: async (event) => {
      document.body.classList.remove('mkh-dragging');
      const spaceRoot = event.to.closest('.space-item')?.querySelector('.space-pages');
      if (!spaceRoot) return;
      const order = collectPageOrder(spaceRoot, null);
      try {
        await api.reorderPages(order);
        callbacks.onRefresh?.();
      } catch (error) {
        showToast("Impossibile salvare l'ordine delle pagine", 'error');
      }
    },
  });
  sortableInstances.push(sorter);
}

function collectPageOrder(container, parentId) {
  const items = [];
  Array.from(container.querySelectorAll(':scope > .page-item')).forEach((item, index) => {
    const pageId = Number(item.dataset.pageId);
    items.push({ id: pageId, parent_page_id: parentId, order_index: index });
    const children = item.querySelector(':scope > .page-children');
    if (children) {
      items.push(...collectPageOrder(children, pageId));
    }
  });
  return items;
}

function getExpanded(type, id) {
  return localStorage.getItem(`mkh_exp_${type}_${id}`) === '1';
}

function setExpanded(type, id, value) {
  localStorage.setItem(`mkh_exp_${type}_${id}`, value ? '1' : '0');
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
}

export function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('visible');
}

function closeContextMenu() {
  document.getElementById('__ctx_menu')?.remove();
}

function startInlineRename(span, onSave) {
  const original = span.textContent;
  const input = document.createElement('input');
  input.className = 'sidebar-rename-input';
  input.value = original;
  span.replaceWith(input);
  input.focus();
  input.select();

  let done = false;
  const finish = async (save) => {
    if (done) return;
    done = true;
    const value = input.value.trim();
    span.textContent = (save && value) ? value : original;
    input.replaceWith(span);
    if (save && value && value !== original) {
      try { await onSave(value); } catch (e) { showToast(e.message, 'error'); span.textContent = original; }
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    e.stopPropagation();
  });
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('click', (e) => e.stopPropagation());
  input.addEventListener('dblclick', (e) => e.stopPropagation());
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
