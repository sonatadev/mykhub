import { api, showToast, SUBJECTS } from './api.js';

let cards = [], idx = 0, correct = 0, incorrect = 0;
let incorrectCards = [], answered = false;

export async function init() {
  const sel = document.getElementById('exam-subject');
  if (sel) {
    sel.innerHTML = `<option value="">Tutte le materie</option>` +
      SUBJECTS.map(s => `<option>${s}</option>`).join('');
  }
  document.getElementById('btn-exam-start')?.addEventListener('click', startExam);
  document.getElementById('btn-show-answer')?.addEventListener('click', showAnswer);
  document.getElementById('btn-correct')?.addEventListener('click', () => answer(true));
  document.getElementById('btn-incorrect')?.addEventListener('click', () => answer(false));
  document.getElementById('btn-exam-restart')?.addEventListener('click', restartExam);
}

async function startExam() {
  const subject = document.getElementById('exam-subject')?.value;
  const all = await api.getCards({ type: 'qa', ...(subject ? { subject } : {}) });
  if (all.length === 0) {
    showToast('Nessuna scheda Domanda/Risposta trovata', 'error');
    return;
  }
  // Shuffle
  cards = all.sort(() => Math.random() - .5);
  idx = correct = incorrect = 0;
  incorrectCards = [];

  document.getElementById('exam-setup').classList.add('hidden');
  document.getElementById('exam-area').classList.remove('hidden');
  document.getElementById('exam-results').classList.add('hidden');
  renderQuestion();
}

function renderQuestion() {
  if (idx >= cards.length) { showResults(); return; }

  const c = cards[idx];
  document.getElementById('exam-counter').textContent = `${idx + 1} / ${cards.length}`;
  document.getElementById('exam-question').textContent = c.title;
  document.getElementById('exam-answer-text').textContent = c.answer || '';
  document.getElementById('exam-answer').classList.add('hidden');
  document.getElementById('exam-buttons').classList.add('hidden');
  document.getElementById('btn-show-answer').classList.remove('hidden');
  answered = false;
}

function showAnswer() {
  document.getElementById('exam-answer').classList.remove('hidden');
  document.getElementById('exam-buttons').classList.remove('hidden');
  document.getElementById('btn-show-answer').classList.add('hidden');
}

async function answer(wasCorrect) {
  if (answered) return;
  answered = true;
  const card = cards[idx];
  if (wasCorrect) {
    correct++;
  } else {
    incorrect++;
    incorrectCards.push(card);
  }
  // Optionally persist done=true when correct
  if (wasCorrect) {
    api.updateCard(card.id, { done: true }).catch(() => {});
  }
  idx++;
  setTimeout(renderQuestion, 300);
}

function showResults() {
  document.getElementById('exam-area').classList.add('hidden');
  document.getElementById('exam-results').classList.remove('hidden');

  const total = cards.length;
  const pct   = total ? Math.round((correct / total) * 100) : 0;
  document.getElementById('res-total').textContent     = total;
  document.getElementById('res-correct').textContent   = correct;
  document.getElementById('res-incorrect').textContent = incorrect;
  document.getElementById('res-pct').textContent       = `${pct}%`;

  // Breakdown by subject
  const bySubj = {};
  for (const c of cards) {
    if (!bySubj[c.subject]) bySubj[c.subject] = { total: 0, correct: 0 };
    bySubj[c.subject].total++;
  }
  for (const c of incorrectCards) { bySubj[c.subject].correct--; } // re-use as "wrong" — let's redo
  // Redo cleanly
  const wrongById = new Set(incorrectCards.map(c => c.id));
  const subjStats = {};
  for (const c of cards) {
    if (!subjStats[c.subject]) subjStats[c.subject] = { total: 0, wrong: 0 };
    subjStats[c.subject].total++;
    if (wrongById.has(c.id)) subjStats[c.subject].wrong++;
  }

  const subjEl = document.getElementById('res-subjects');
  subjEl.innerHTML = Object.entries(subjStats).map(([s, v]) =>
    `<div class="result-row"><span>${s}</span><span>${v.total - v.wrong} / ${v.total} corrette</span></div>`
  ).join('');

  const errEl = document.getElementById('res-errors');
  errEl.innerHTML = incorrectCards.length === 0
    ? '<p style="color:var(--success)">Perfetto! Nessun errore.</p>'
    : incorrectCards.map(c => `
      <div class="card" style="margin-bottom:10px">
        <div class="card-title" style="margin-bottom:6px">${esc(c.title)}</div>
        <div style="font-size:.85rem;color:var(--text-muted)">${esc(c.answer || '')}</div>
      </div>`).join('');
}

function restartExam() {
  document.getElementById('exam-setup').classList.remove('hidden');
  document.getElementById('exam-results').classList.add('hidden');
  document.getElementById('exam-area').classList.add('hidden');
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
