const PALETTES = [
  { id: 'obsidian', name: 'Obsidian', bg: '#1e1e1e', accent: '#7c6af7' },
  { id: 'oceano',   name: 'Oceano',   bg: '#071a2e', accent: '#38bdf8' },
  { id: 'foresta',  name: 'Foresta',  bg: '#141f14', accent: '#7bc47f' },
  { id: 'ambra',    name: 'Ambra',    bg: '#1d1610', accent: '#f59e0b' },
  { id: 'alba',     name: 'Alba',     bg: '#fafaf8', accent: '#7c6af7' },
  { id: 'carta',    name: 'Carta',    bg: '#f5f0e8', accent: '#c2603a' },
  { id: 'y2k',      name: 'Y2K',      bg: '#180f28', accent: '#ff2ec4', theme: 'y2k',
    preview: 'radial-gradient(circle at 25% 25%, #ffe600 0 3px, transparent 4px) 0 0/16px 16px, radial-gradient(circle at 70% 60%, #00e5ff 0 3px, transparent 4px) 0 0/16px 16px, linear-gradient(135deg,#0c0718 0%,#180f28 55%,#2a1040 100%)' },
];

let saveCallback = null;
let previewCallback = null;
let restoreCallback = null;

export function initSettings({ onSave, onPreview, onRestore }) {
  saveCallback = onSave;
  previewCallback = onPreview;
  restoreCallback = onRestore;
}

export function openSettingsPanel(settings = {}, email = '') {
  const container = document.getElementById('settings-container');
  if (container.querySelector('.settings-panel')) return;

  const working = {
    paletteId: findPaletteId(settings),
    font: settings.font || 'inter',
  };

  container.innerHTML = `
    <div class="settings-backdrop"></div>
    <div class="settings-panel">
      <div class="settings-panel-header">
        <span class="settings-panel-title">Impostazioni</span>
        <button class="btn-icon" id="sp-close" title="Chiudi"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg></button>
      </div>
      <div class="settings-panel-body">

        <div class="sp-section">
          <div class="sp-section-title">Palette</div>
          <div class="sp-palettes" id="sp-palettes">
            ${PALETTES.map(p => `
              <button class="sp-palette-card" data-palette="${p.id}" title="${p.name}">
                <div class="sp-palette-preview" style="background:${p.preview || p.bg}">
                  <div class="sp-palette-dot" style="background:${p.accent}"></div>
                  <svg class="sp-palette-check" width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" fill="rgba(255,255,255,0.9)"/>
                    <path d="M5 8l2.5 2.5L11 5.5" stroke="#111" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="sp-palette-name">${p.name}</div>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="sp-section">
          <div class="sp-section-title">Font editor</div>
          <div class="sp-fonts">
            <div class="sp-font-option" data-font="inter">
              <span class="sp-font-label">Inter</span>
              <span class="sp-font-preview" style="font-family:'Inter',sans-serif">Aa</span>
            </div>
            <div class="sp-font-option" data-font="georgia">
              <span class="sp-font-label">Georgia</span>
              <span class="sp-font-preview" style="font-family:'Georgia',serif">Aa</span>
            </div>
            <div class="sp-font-option" data-font="jetbrains">
              <span class="sp-font-label">JetBrains Mono</span>
              <span class="sp-font-preview" style="font-family:'JetBrains Mono',monospace">Aa</span>
            </div>
          </div>
        </div>

        <div class="sp-section">
          <div class="sp-section-title">Backup dati</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <button class="btn btn-ghost btn-full" id="sp-export" style="justify-content:center;gap:8px;font-size:13px;">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
              Scarica backup
            </button>
            <button class="btn btn-ghost btn-full" id="sp-import" style="justify-content:center;gap:8px;font-size:13px;">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/></svg>
              Ripristina da backup
            </button>
            <input type="file" id="sp-import-file" accept=".json" style="display:none">
            <div id="sp-backup-msg" style="font-size:11px;color:var(--text-muted);min-height:14px;text-align:center;"></div>
          </div>
        </div>

        <div class="sp-section">
          <div class="sp-section-title">Account</div>
          <div class="sp-account-info">${escapeHtml(email)}</div>
        </div>

      </div>
      <div class="settings-panel-footer">
        <button class="btn btn-primary btn-full" id="sp-save">Salva preferenze</button>
      </div>
    </div>
  `;

  const panel    = container.querySelector('.settings-panel');
  const backdrop = container.querySelector('.settings-backdrop');

  function syncUI() {
    container.querySelectorAll('.sp-palette-card').forEach(card =>
      card.classList.toggle('selected', card.dataset.palette === working.paletteId)
    );
    container.querySelectorAll('.sp-font-option').forEach(opt =>
      opt.classList.toggle('selected', opt.dataset.font === working.font)
    );
  }

  const originalSettings = workingToSettings({ paletteId: findPaletteId(settings), font: settings.font || 'inter' });

  syncUI();

  requestAnimationFrame(() => requestAnimationFrame(() => {
    panel.classList.add('open');
    backdrop.classList.add('visible');
  }));

  let saved = false;

  function closePanel() {
    if (!saved) previewCallback?.(originalSettings);
    panel.classList.remove('open');
    backdrop.classList.remove('visible');
    setTimeout(() => { container.innerHTML = ''; }, 160);
  }

  container.querySelector('#sp-close').addEventListener('click', closePanel);
  backdrop.addEventListener('click', closePanel);

  container.querySelectorAll('.sp-palette-card').forEach(card =>
    card.addEventListener('click', () => {
      working.paletteId = card.dataset.palette;
      syncUI();
      previewCallback?.(workingToSettings(working));
    })
  );

  container.querySelectorAll('.sp-font-option').forEach(opt =>
    opt.addEventListener('click', () => {
      working.font = opt.dataset.font;
      syncUI();
      previewCallback?.(workingToSettings(working));
    })
  );

  container.querySelector('#sp-save').addEventListener('click', async () => {
    saved = true;
    await saveCallback?.(workingToSettings(working));
    closePanel();
  });

  const backupMsg = container.querySelector('#sp-backup-msg');

  container.querySelector('#sp-export').addEventListener('click', async () => {
    try {
      backupMsg.textContent = 'Esportazione in corso…';
      const data = await import('./api.js').then(m => m.api.exportBackup());
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mykhub_backup_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      backupMsg.textContent = 'Backup scaricato ✓';
      setTimeout(() => { backupMsg.textContent = ''; }, 3000);
    } catch (err) {
      backupMsg.textContent = 'Errore: ' + err.message;
    }
  });

  const fileInput = container.querySelector('#sp-import-file');
  container.querySelector('#sp-import').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      backupMsg.textContent = 'Lettura file…';
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data.spaces) || !Array.isArray(data.pages))
        throw new Error('File non valido');
      if (!confirm(`Ripristinare ${data.spaces.length} spazi e ${data.pages.length} pagine?\nAttenzione: i dati attuali verranno sostituiti.`))
        return;
      backupMsg.textContent = 'Ripristino in corso…';
      const result = await import('./api.js').then(m => m.api.restoreBackup(data));
      backupMsg.textContent = `Ripristinati ${result.spaces} spazi, ${result.pages} pagine ✓`;
      saved = true;
      setTimeout(() => {
        closePanel();
        restoreCallback?.();
      }, 1200);
    } catch (err) {
      backupMsg.textContent = 'Errore: ' + err.message;
    } finally {
      fileInput.value = '';
    }
  });
}

function findPaletteId(settings) {
  const match = PALETTES.find(p => p.bg === settings.bgColor && p.accent === settings.accent);
  return match?.id || 'obsidian';
}

function workingToSettings(working) {
  const palette = PALETTES.find(p => p.id === working.paletteId) || PALETTES[0];
  return {
    bgColor: palette.bg,
    accent:  palette.accent,
    theme:   palette.theme || (colorIsDark(palette.bg) ? 'dark' : 'light'),
    font:    working.font,
  };
}

function colorIsDark(hex) {
  if (!hex || hex.length < 7) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
