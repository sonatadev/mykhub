import { api, formatDate, TYPE_LABELS } from './api.js';

export async function init() {
  const cards = await api.getCards();

  const total = cards.length;
  const done  = cards.filter(c => c.done).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('db-total').textContent = total;
  document.getElementById('db-done').textContent  = done;
  document.getElementById('db-pct').textContent   = `${pct}%`;
  document.getElementById('db-progress').style.width = `${pct}%`;

  // Per-subject stats
  const subjects = {};
  for (const c of cards) {
    if (!subjects[c.subject]) subjects[c.subject] = { total: 0, done: 0 };
    subjects[c.subject].total++;
    if (c.done) subjects[c.subject].done++;
  }

  const subEl = document.getElementById('db-subjects');
  if (Object.keys(subjects).length === 0) {
    subEl.innerHTML = `<div class="empty-state"><div class="empty-icon"></div><div class="empty-title">Nessuna scheda ancora</div><div class="empty-desc"><a href="#/library" style="color:var(--accent)">Crea la tua prima scheda →</a></div></div>`;
  } else {
    subEl.innerHTML = Object.entries(subjects).map(([subj, s]) => {
      const p = Math.round((s.done / s.total) * 100);
      return `<div class="card">
        <div class="card-header"><span class="card-title">${subj}</span><span class="badge badge-blue">${s.total}</span></div>
        <div class="card-body-text">${s.done} / ${s.total} studiate</div>
        <div class="progress"><div class="progress-bar" style="width:${p}%"></div></div>
      </div>`;
    }).join('');
  }

  // Recent cards (last 6)
  const recent = cards.slice(0, 6);
  const recEl  = document.getElementById('db-recent');
  recEl.innerHTML = recent.length === 0 ? '' : recent.map(c => `
    <div class="card" style="margin-bottom:10px">
      <div class="card-header">
        <span class="card-title">${escHtml(c.title)}</span>
        <span class="badge badge-gray">${TYPE_LABELS[c.type]}</span>
      </div>
      <div class="card-body-text">${escHtml(c.subject)}${c.topic ? ' · ' + escHtml(c.topic) : ''}</div>
      <div class="card-footer">
        <span class="badge ${c.done ? 'badge-green' : 'badge-gray'}">${c.done ? '✓ Studiata' : 'Da studiare'}</span>
        <span style="margin-left:auto;font-size:.78rem;color:var(--text-muted)">${formatDate(c.created_at)}</span>
      </div>
    </div>`).join('');
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
