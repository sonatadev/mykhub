import { showToast, showModal } from './ui.js';
import { api } from './api.js';

const {
  Editor, StarterKit, Typography, Placeholder, Link,
  Table, TableRow, TableCell, TableHeader,
  TaskList, TaskItem, Image, Underline,
  Y, WebsocketProvider, Collaboration, CollaborationCursor,
} = window.Tiptap;

// ── Cursor color palette ───────────────────────────────────────────────────
const CURSOR_COLORS = [
  '#f87171','#fb923c','#fbbf24','#4ade80',
  '#60a5fa','#818cf8','#c084fc','#f472b6',
];
function getCursorColor(userId) {
  return CURSOR_COLORS[(userId || 0) % CURSOR_COLORS.length];
}

// ── Resizable + alignable image node ──────────────────────────────────────
const ResizableImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: el => el.getAttribute('width') ? parseInt(el.getAttribute('width'), 10) : null,
        renderHTML: attrs => attrs.width ? { width: attrs.width } : {},
      },
      align: {
        default: 'center',
        parseHTML: el => {
          if (el.style.float === 'left')  return 'left';
          if (el.style.float === 'right') return 'right';
          return 'center';
        },
        renderHTML: attrs => {
          const s = attrs.align === 'left'  ? 'float:left;margin:0 12px 8px 0'
                  : attrs.align === 'right' ? 'float:right;margin:0 0 8px 12px'
                  : 'display:block;margin:0 auto';
          return { style: s };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor: ed }) => {
      let currentNode = node;

      const outer = document.createElement('div');
      outer.className = 'img-node-outer';
      outer.dataset.align = node.attrs.align || 'center';

      const inner = document.createElement('div');
      inner.className = 'img-node-inner';
      if (node.attrs.width) inner.style.width = node.attrs.width + 'px';

      const img = document.createElement('img');
      img.src = node.attrs.src || '';
      img.alt = node.attrs.alt || '';
      img.draggable = false;

      const alignBar = document.createElement('div');
      alignBar.className = 'img-align-bar';
      alignBar.innerHTML =
        '<button data-align="left" title="Sinistra">◀</button>' +
        '<button data-align="center" title="Centra">■</button>' +
        '<button data-align="right" title="Destra">▶</button>' +
        '<button data-action="delete" title="Elimina immagine">🗑</button>';

      const handle = document.createElement('div');
      handle.className = 'img-resize-handle';

      inner.appendChild(img);
      inner.appendChild(alignBar);
      inner.appendChild(handle);
      outer.appendChild(inner);

      const updateAttrs = (attrs) => {
        if (typeof getPos !== 'function') return;
        ed.chain().command(({ tr }) => {
          tr.setNodeMarkup(getPos(), null, { ...currentNode.attrs, ...attrs });
          return true;
        }).run();
      };

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startW = inner.offsetWidth;
        document.body.style.userSelect = 'none';
        const onMove = (e) => { inner.style.width = Math.max(80, startW + e.clientX - startX) + 'px'; };
        const onUp = () => {
          updateAttrs({ width: inner.offsetWidth });
          document.body.style.userSelect = '';
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      alignBar.addEventListener('mousedown', (e) => {
        const btn = e.target.closest('[data-align],[data-action]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        if (btn.dataset.action === 'delete') {
          if (typeof getPos === 'function') {
            const pos = getPos();
            ed.chain().command(({ tr, dispatch }) => {
              if (dispatch) dispatch(tr.delete(pos, pos + currentNode.nodeSize));
              return true;
            }).run();
            scheduleUpdate();
          }
          return;
        }
        outer.dataset.align = btn.dataset.align;
        updateAttrs({ align: btn.dataset.align });
      });

      inner.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.img-node-inner.img-selected')
          .forEach(el => { if (el !== inner) el.classList.remove('img-selected'); });
        inner.classList.toggle('img-selected');
      });
      const onOutside = (e) => {
        if (!inner.contains(e.target)) inner.classList.remove('img-selected');
      };
      document.addEventListener('mousedown', onOutside);

      return {
        dom: outer,
        update(updatedNode) {
          if (updatedNode.type.name !== 'image') return false;
          currentNode = updatedNode;
          img.src = updatedNode.attrs.src || '';
          img.alt = updatedNode.attrs.alt || '';
          inner.style.width = updatedNode.attrs.width ? updatedNode.attrs.width + 'px' : '';
          outer.dataset.align = updatedNode.attrs.align || 'center';
          return true;
        },
        destroy() { document.removeEventListener('mousedown', onOutside); },
      };
    };
  },
});

// ── Module state ─────────────────────────────────────────────────────────
let editor   = null;
let provider = null;
let ydoc     = null;
let onContentChanged = null;
let currentUser = null; // { id, email }
let updateTimer = null;
let pollTimer   = null;
let lastEditTime = 0;
let _toolbarBound = false;

const toolbar = document.getElementById('bubble-toolbar');

// ── Public: one-time setup ────────────────────────────────────────────────
export function initEditor({ onChange, user }) {
  onContentChanged = onChange;
  currentUser = user;

  if (_toolbarBound) return;
  _toolbarBound = true;

  toolbar.addEventListener('click', (event) => {
    if (!editor) return;
    const button = event.target.closest('[data-cmd]');
    if (!button) return;
    event.preventDefault();
    const cmd = button.dataset.cmd;
    if (cmd === 'link')   { promptLink(); return; }
    if (cmd === 'bold')      editor.chain().focus().toggleBold().run();
    if (cmd === 'italic')    editor.chain().focus().toggleItalic().run();
    if (cmd === 'underline') editor.chain().focus().toggleUnderline().run();
    if (cmd === 'h1')     editor.chain().focus().toggleHeading({ level: 1 }).run();
    if (cmd === 'h2')     editor.chain().focus().toggleHeading({ level: 2 }).run();
    if (cmd === 'ul')     editor.chain().focus().toggleBulletList().run();
    if (cmd === 'ol')     editor.chain().focus().toggleOrderedList().run();
    if (cmd === 'task')   editor.chain().focus().toggleTaskList().run();
    if (cmd === 'table')  editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    renderToolbarState();
  });
}

// ── Public: open a page in the editor (creates new editor + WS provider) ─
export function openPageInEditor(pageId, pageContent, ydocState) {
  _destroyCurrentEditor();

  ydoc = new Y.Doc();

  // Pre-initialize the Y.Doc from the persisted binary state sent by the server.
  // Both client and server now start from the same Y.js operations, so the
  // WebSocket sync only exchanges deltas — no duplication, no wait needed.
  if (ydocState) {
    try {
      const bytes = Uint8Array.from(atob(ydocState), c => c.charCodeAt(0));
      Y.applyUpdate(ydoc, bytes);
    } catch (_) { /* fall through to sync-based init */ }
  }
  const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  provider = new WebsocketProvider(
    `${wsProtocol}//${location.host}/collab`,
    `page-${pageId}`,
    ydoc,
    { params: { token: api.getToken() } },
  );

  if (currentUser) {
    const userMeta = { name: currentUser.email, color: getCursorColor(currentUser.id) };
    provider.awareness.setLocalStateField('user', userMeta);
  }

  editor = new Editor({
    element: document.getElementById('tiptap-editor'),
    extensions: [
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: currentUser
          ? { name: currentUser.email, color: getCursorColor(currentUser.id) }
          : { name: 'Utente', color: '#818cf8' },
      }),
      StarterKit.configure({ history: false }),
      Typography,
      Placeholder.configure({ placeholder: 'Inizia a scrivere…' }),
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      ResizableImage.configure({ inline: false, allowBase64: true }),
      Underline,
    ],
    editorProps: {
      handleKeyDown(view, event) {
        if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
          if (event.key.toLowerCase() === 'b') { event.preventDefault(); editor.chain().focus().toggleBold().run(); return true; }
          if (event.key.toLowerCase() === 'i') { event.preventDefault(); editor.chain().focus().toggleItalic().run(); return true; }
          if (event.key.toLowerCase() === 'u') { event.preventDefault(); editor.chain().focus().toggleUnderline().run(); return true; }
          if (event.key.toLowerCase() === 'k') { event.preventDefault(); promptLink(); return true; }
          if (event.key.toLowerCase() === 's') {
            event.preventDefault();
            clearTimeout(updateTimer);
            onContentChanged?.(editor.getJSON());
            return true;
          }
        }
        if (event.key === 'Tab' && editor.can().sinkListItem('listItem')) {
          event.preventDefault();
          editor.chain().focus().sinkListItem('listItem').run();
          return true;
        }
        return false;
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) insertImageFile(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate() { scheduleUpdate(); renderToolbarState(); },
    onSelectionUpdate() { renderToolbarState(); },
  });

  const yFragment = ydoc.get('prosemirror', Y.XmlFragment);

  if (ydocState && yFragment.length > 0) {
    // Y.Doc is pre-initialized from ydoc_state: content is already visible.
    // WebSocket will sync only the delta from collaborators — no seed needed.
  } else {
    // First time this page has a Y.js state: wait for sync, then seed from DB
    // if the server Y.Doc is also empty (avoids CRDT duplication).
    const tryInitContent = () => {
      if (yFragment.length === 0 && pageContent) {
        editor.commands.setContent(pageContent);
      }
    };
    if (provider.synced) {
      tryInitContent();
    } else {
      const fallback = setTimeout(tryInitContent, 1500);
      provider.once('sync', () => { clearTimeout(fallback); tryInitContent(); });
    }
  }

  // Polling fallback: if the Y.js WebSocket is not connected (e.g. blocked by
  // a proxy), poll the API every 4 seconds and update the editor when a
  // collaborator has saved newer content and the local user is idle.
  let knownUpdatedAt = null;
  api.getPage(pageId).then(p => { knownUpdatedAt = p.updated_at; }).catch(() => {});
  pollTimer = setInterval(async () => {
    if (!editor || !ydoc) return;
    if (provider?.wsconnected) return; // Y.js real-time is working, no need to poll
    if (Date.now() - lastEditTime < 5000) return; // user is actively typing
    try {
      const page = await api.getPage(pageId);
      if (knownUpdatedAt && page.updated_at !== knownUpdatedAt) {
        knownUpdatedAt = page.updated_at;
        // Merge the server's Y.js state instead of replacing the document:
        // a CRDT update is commutative, so it can never discard local
        // keystrokes that haven't reached the server yet. setContent() here
        // used to blow away the whole doc with the (separately-saved, often
        // stale) `content` column, which is what caused text typed during a
        // brief WebSocket drop to vanish.
        if (page.ydoc_state) {
          try {
            const bytes = Uint8Array.from(atob(page.ydoc_state), c => c.charCodeAt(0));
            Y.applyUpdate(ydoc, bytes);
          } catch (_) {}
        }
      }
    } catch (_) {}
  }, 4000);
}

// ── Public: cleanup ────────────────────────────────────────────────────────
export function closePageEditor() {
  _destroyCurrentEditor();
}

export function clearEditor() {
  if (editor) editor.commands.clearContent();
}

export function focusEditor() {
  if (editor) editor.commands.focus();
}

// ── Internal ───────────────────────────────────────────────────────────────
function _destroyCurrentEditor() {
  clearTimeout(updateTimer);
  clearInterval(pollTimer);
  pollTimer = null;
  if (provider) { provider.destroy(); provider = null; }
  if (ydoc)     { ydoc.destroy();     ydoc     = null; }
  if (editor)   { editor.destroy();   editor   = null; }
}

async function insertImageFile(file) {
  try {
    const form = new FormData();
    form.append('file', file);
    const resp = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${api.getToken()}` },
      body: form,
    });
    if (!resp.ok) throw new Error('Upload fallito');
    const { url } = await resp.json();
    if (editor) {
      editor.chain().focus().setImage({ src: url }).run();
      scheduleUpdate();
    }
  } catch (e) {
    showToast('Errore caricamento immagine', 'error');
  }
}

function scheduleUpdate() {
  lastEditTime = Date.now();
  clearTimeout(updateTimer);
  updateTimer = setTimeout(() => {
    if (!editor) return;
    onContentChanged?.(editor.getJSON());
  }, 1000);
}

function promptLink() {
  if (!editor) return;
  const current = editor.getAttributes('link').href || '';

  const input = document.createElement('input');
  input.className = 'form-input';
  input.type = 'url';
  input.placeholder = 'https://…';
  input.value = current;
  input.style.width = '100%';

  const modal = showModal({
    title: 'Inserisci link',
    content: input,
    confirmLabel: 'Applica',
    onConfirm: () => {
      const href = input.value.trim();
      if (!href) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
      }
    },
  });

  if (current) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-ghost btn-sm';
    removeBtn.textContent = 'Rimuovi';
    removeBtn.style.marginRight = 'auto';
    removeBtn.addEventListener('click', () => {
      modal.remove();
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    });
    modal.querySelector('.modal-footer').prepend(removeBtn);
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); modal.querySelector('#modal-confirm').click(); }
  });
}

function renderToolbarState() {
  if (!editor) return;
  toolbar.querySelector('[data-cmd="bold"]')?.classList.toggle('active', editor.isActive('bold'));
  toolbar.querySelector('[data-cmd="italic"]')?.classList.toggle('active', editor.isActive('italic'));
  toolbar.querySelector('[data-cmd="underline"]')?.classList.toggle('active', editor.isActive('underline'));
  toolbar.querySelector('[data-cmd="h1"]')?.classList.toggle('active', editor.isActive('heading', { level: 1 }));
  toolbar.querySelector('[data-cmd="h2"]')?.classList.toggle('active', editor.isActive('heading', { level: 2 }));
  toolbar.querySelector('[data-cmd="ul"]')?.classList.toggle('active', editor.isActive('bulletList'));
  toolbar.querySelector('[data-cmd="ol"]')?.classList.toggle('active', editor.isActive('orderedList'));
  toolbar.querySelector('[data-cmd="task"]')?.classList.toggle('active', editor.isActive('taskList'));
  toolbar.querySelector('[data-cmd="table"]')?.classList.toggle('active', editor.isActive('table'));
}
