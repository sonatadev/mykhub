import { api, showToast, generateQA, SUBJECTS, TYPE_LABELS, formatDate } from './api.js';

let allCards = [];
let editingId = null;

export async function init() {
  allCards = await api.getCards();
  renderCards(allCards);
  bindFilters();
  bindModal();
}

/* ── Render ────────────────────────────────── */
function renderCards(cards) {
  const grid = document.getElementById('lib-grid');
  if (cards.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-title">Nessuna scheda trovata</div>
      <div class="empty-desc">Prova a cambiare i filtri o crea una nuova scheda</div>
      <button class="btn btn-primary" id="empty-add" style="margin-top:20px">+ Nuova scheda</button>
    </div>`;
    document.getElementById('empty-add')?.addEventListener('click', openAdd);
    return;
  }
  grid.innerHTML = cards.map(c => cardHtml(c)).join('');
  grid.querySelectorAll('[data-toggle-done]').forEach(btn => {
    btn.addEventListener('click', () => toggleDone(Number(btn.dataset.toggleDone)));
  });
  grid.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openEdit(Number(btn.dataset.edit)));
  });
  grid.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteCard(Number(btn.dataset.delete)));
  });
  grid.querySelectorAll('[data-gen-ai]').forEach(btn => {
    btn.addEventListener('click', () => genAI(Number(btn.dataset.genAi)));
  });
}

function cardHtml(c) {
  const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<div class="card" id="card-${c.id}">
    <div class="card-header">
      <span class="card-title">${esc(c.title)}</span>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="icon-btn btn-sm" data-edit="${c.id}" title="Modifica">Mod</button>
        <button class="icon-btn btn-sm" data-delete="${c.id}" title="Elimina">Del</button>
      </div>
    </div>
    <div class="card-body-text" style="margin-bottom:8px">${esc(c.body).substring(0, 180)}${c.body.length > 180 ? '…' : ''}</div>
    ${c.type === 'qa' && c.answer ? `<details style="margin-top:4px"><summary style="font-size:.8rem;cursor:pointer;color:var(--accent)">Mostra risposta</summary><p style="font-size:.85rem;margin-top:6px;color:var(--text-muted)">${esc(c.answer)}</p></details>` : ''}
    <div class="card-footer">
      <span class="badge badge-blue">${esc(c.subject)}</span>
      ${c.topic ? `<span class="badge badge-gray">${esc(c.topic)}</span>` : ''}
      <span class="badge badge-gray">${TYPE_LABELS[c.type]}</span>
      <button class="btn btn-sm ${c.done ? 'btn-success' : 'btn-ghost'}" data-toggle-done="${c.id}" style="margin-left:auto">
        ${c.done ? '✓ Studiata' : 'Segna studiata'}
      </button>
    </div>
    ${c.type === 'summary' ? `<div style="margin-top:10px"><button class="btn btn-ghost btn-sm" data-gen-ai="${c.id}">Genera domande</button></div>` : ''}
  </div>`;
}

/* ── Filters ───────────────────────────────── */
function bindFilters() {
  const filterFn = () => {
    const subj  = document.getElementById('filter-subject').value;
    const type  = document.getElementById('filter-type').value;
    const state = document.getElementById('filter-done').value;
    const q     = document.getElementById('search-q').value.toLowerCase();

    const filtered = allCards.filter(c => {
      if (subj  && c.subject !== subj) return false;
      if (type  && c.type    !== type) return false;
      if (state === 'done'  && !c.done) return false;
      if (state === 'todo'  &&  c.done) return false;
      if (q && !c.title.toLowerCase().includes(q) && !c.body.toLowerCase().includes(q)) return false;
      return true;
    });
    renderCards(filtered);
  };

  ['filter-subject','filter-type','filter-done'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', filterFn));
  document.getElementById('search-q')?.addEventListener('input', filterFn);
  document.getElementById('btn-add-card')?.addEventListener('click', openAdd);
}

/* ── Toggle done ───────────────────────────── */
async function toggleDone(id) {
  const card = allCards.find(c => c.id === id);
  if (!card) return;
  try {
    const updated = await api.updateCard(id, { done: !card.done });
    card.done = updated.done;
    const el = document.getElementById(`card-${id}`);
    if (el) el.outerHTML = cardHtml(updated);
    // re-bind that card
    document.getElementById(`card-${id}`)?.querySelectorAll('[data-toggle-done]').forEach(btn =>
      btn.addEventListener('click', () => toggleDone(Number(btn.dataset.toggleDone))));
    document.getElementById(`card-${id}`)?.querySelector(`[data-edit="${id}"]`)?.addEventListener('click', () => openEdit(id));
    document.getElementById(`card-${id}`)?.querySelector(`[data-delete="${id}"]`)?.addEventListener('click', () => deleteCard(id));
  } catch (e) { showToast(e.message, 'error'); }
}

/* ── Delete ────────────────────────────────── */
async function deleteCard(id) {
  if (!confirm('Eliminare questa scheda?')) return;
  try {
    await api.deleteCard(id);
    allCards = allCards.filter(c => c.id !== id);
    renderCards(allCards);
    showToast('Scheda eliminata', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

/* ── Modal (add / edit) ────────────────────── */
function openAdd() { editingId = null; resetModal(); openModal(); }
function openEdit(id) {
  editingId = id;
  const c = allCards.find(c => c.id === id);
  if (!c) return;
  document.getElementById('modal-title-label').textContent = 'Modifica scheda';
  document.getElementById('modal-type').value    = c.type;
  document.getElementById('modal-subject').value = c.subject;
  document.getElementById('modal-topic').value   = c.topic || '';
  document.getElementById('modal-title-in').value = c.title;
  document.getElementById('modal-body').value    = c.body;
  document.getElementById('modal-answer').value  = c.answer || '';
  updateAnswerVisibility();
  openModal();
}
function resetModal() {
  document.getElementById('modal-title-label').textContent = 'Aggiungi scheda';
  document.getElementById('card-form').reset();
  updateAnswerVisibility();
}
function openModal()  { document.getElementById('card-modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('card-modal').classList.add('hidden'); }
function updateAnswerVisibility() {
  const isQA = document.getElementById('modal-type').value === 'qa';
  document.getElementById('answer-group').style.display = isQA ? '' : 'none';
}

function bindModal() {
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-type')?.addEventListener('change', updateAnswerVisibility);

  document.getElementById('card-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      type:    document.getElementById('modal-type').value,
      subject: document.getElementById('modal-subject').value,
      topic:   document.getElementById('modal-topic').value.trim() || null,
      title:   document.getElementById('modal-title-in').value.trim(),
      body:    document.getElementById('modal-body').value.trim(),
      answer:  document.getElementById('modal-answer').value.trim() || null,
    };
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      if (editingId) {
        const updated = await api.updateCard(editingId, payload);
        const idx = allCards.findIndex(c => c.id === editingId);
        if (idx > -1) allCards[idx] = updated;
      } else {
        const created = await api.createCard(payload);
        allCards.unshift(created);
      }
      renderCards(allCards);
      closeModal();
      showToast(editingId ? 'Scheda aggiornata' : 'Scheda creata', 'success');
    } catch (err) { showToast(err.message, 'error'); }
    finally { btn.disabled = false; }
  });
}

/* ── AI generation ─────────────────────────── */
async function genAI(id) {
  const card = allCards.find(c => c.id === id);
  if (!card) return;
  const btn = document.querySelector(`[data-gen-ai="${id}"]`);
  if (btn) { btn.disabled = true; btn.textContent = 'Generazione…'; }
  try {
    const pairs = await generateQA(card.body);
    let created = 0;
    for (const { q, a } of pairs) {
      if (!q || !a) continue;
      const newCard = await api.createCard({
        type: 'qa', subject: card.subject, topic: card.topic,
        title: q.trim(), body: q.trim(), answer: a.trim(),
      });
      allCards.unshift(newCard);
      created++;
    }
    renderCards(allCards);
    showToast(`${created} domande generate`, 'success');
  } catch (e) { showToast(e.message, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = 'Genera domande'; } }
}
