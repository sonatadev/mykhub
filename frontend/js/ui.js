export function showToast(message, type = 'default', duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast${type !== 'default' ? ' ' + type : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function showModal({ title, content, confirmLabel = 'Salva', confirmClass = 'btn-primary', onConfirm, onCancel }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-title">${escapeHtml(title)}</div>
      <div class="modal-body"></div>
      <div class="modal-footer">
        <button class="btn btn-ghost btn-sm" id="modal-cancel">Annulla</button>
        <button class="btn ${confirmClass} btn-sm" id="modal-confirm">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>
  `;
  const body = overlay.querySelector('.modal-body');
  if (typeof content === 'string') body.innerHTML = content;
  else if (content instanceof HTMLElement) body.appendChild(content);

  function close(result) {
    overlay.remove();
    if (result && onConfirm) onConfirm();
    if (!result && onCancel) onCancel();
    document.removeEventListener('keydown', handleKeyDown);
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') close(false);
  }

  overlay.querySelector('#modal-cancel').addEventListener('click', () => close(false));
  overlay.querySelector('#modal-confirm').addEventListener('click', () => close(true));
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close(false);
  });
  document.addEventListener('keydown', handleKeyDown);
  document.body.appendChild(overlay);
  setTimeout(() => overlay.querySelector('input')?.focus(), 50);
  return overlay;
}

export function showPrompt({ title, placeholder = '', value = '', confirmLabel = 'Salva', onConfirm }) {
  const input = document.createElement('input');
  input.className = 'form-input';
  input.type = 'text';
  input.placeholder = placeholder;
  input.value = value;

  const modal = showModal({
    title,
    content: input,
    confirmLabel,
    onConfirm: () => {
      const text = input.value.trim();
      if (text) onConfirm(text);
    },
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      modal.querySelector('#modal-confirm').click();
    }
  });
}

export function showConfirm({ title, message, confirmLabel = 'Elimina', onConfirm }) {
  showModal({
    title,
    content: `<p style="font-size:13px;color:var(--text-muted);margin:0;">${escapeHtml(message)}</p>`,
    confirmLabel,
    confirmClass: 'btn-danger',
    onConfirm,
  });
}

export function showContextMenu(x, y, items) {
  closeContextMenu();
  const menu = document.createElement('div');
  menu.id = '__ctx_menu';
  menu.className = 'ctx-menu';
  items.forEach((item) => {
    if (item === 'sep') {
      const sep = document.createElement('div');
      sep.className = 'ctx-sep';
      menu.appendChild(sep);
      return;
    }
    const row = document.createElement('div');
    row.className = `ctx-item${item.danger ? ' danger' : ''}`;
    row.innerHTML = item.icon
      ? `<span>${item.icon}</span><span>${escapeHtml(item.label)}</span>`
      : `<span>${escapeHtml(item.label)}</span>`;
    row.addEventListener('click', () => {
      closeContextMenu();
      item.action();
    });
    menu.appendChild(row);
  });
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  const left = x + rect.width > window.innerWidth ? window.innerWidth - rect.width - 12 : x;
  const top = y + rect.height > window.innerHeight ? Math.max(12, y - rect.height) : y;
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  document.addEventListener('mousedown', handleOutsideClick, { once: true });
}

function handleOutsideClick(event) {
  if (!event.target.closest('#__ctx_menu')) closeContextMenu();
}

export function closeContextMenu() {
  document.getElementById('__ctx_menu')?.remove();
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
