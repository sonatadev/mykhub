import { api, showToast, SUBJECTS, getUser } from './api.js';
import { getUser as routerGetUser } from './router.js';

let cards = [], idx = 0;
let timerInterval = null, secondsLeft = 0, isWork = true, isRunning = false;
let workMin = 25, breakMin = 5;

export async function init() {
  const user = routerGetUser();
  workMin  = user?.pomodoro_work  ?? 25;
  breakMin = user?.pomodoro_break ?? 5;

  document.getElementById('study-subject')?.addEventListener('change', loadCards);
  document.getElementById('study-start')?.addEventListener('click', loadCards);
  document.getElementById('btn-prev')?.addEventListener('click', () => go(-1));
  document.getElementById('btn-next')?.addEventListener('click', () => go(1));
  document.getElementById('btn-done')?.addEventListener('click', markDone);
  document.getElementById('btn-timer-toggle')?.addEventListener('click', toggleTimer);
  document.getElementById('btn-timer-reset')?.addEventListener('click', resetTimer);

  // Populate subject selector
  const sel = document.getElementById('study-subject');
  if (sel) {
    sel.innerHTML = `<option value="">Tutte le materie</option>` +
      SUBJECTS.map(s => `<option>${s}</option>`).join('');
  }

  resetTimer();
}

async function loadCards() {
  const subject = document.getElementById('study-subject')?.value;
  const all = await api.getCards(subject ? { subject } : {});
  cards = all;
  idx = 0;
  renderCard();
  document.getElementById('study-area').classList.remove('hidden');
}

function renderCard() {
  const card   = cards[idx];
  const titleEl = document.getElementById('study-card-title');
  const bodyEl  = document.getElementById('study-card-body');
  const counter = document.getElementById('study-counter');
  const doneBtn = document.getElementById('btn-done');

  counter.textContent = cards.length ? `${idx + 1} / ${cards.length}` : '0 / 0';

  if (!card) {
    titleEl.textContent = 'Nessuna scheda';
    bodyEl.textContent  = 'Prova a cambiare la materia o aggiungere schede dalla Libreria.';
    if (doneBtn) doneBtn.classList.add('hidden');
    return;
  }
  titleEl.textContent = card.title;
  bodyEl.textContent  = card.body;
  if (doneBtn) {
    doneBtn.classList.remove('hidden');
    doneBtn.textContent = card.done ? '↩ Segna da rivedere' : '✓ Segna studiata';
    doneBtn.className   = `btn ${card.done ? 'btn-ghost' : 'btn-success'}`;
  }
}

function go(delta) {
  if (!cards.length) return;
  idx = (idx + delta + cards.length) % cards.length;
  renderCard();
}

async function markDone() {
  const card = cards[idx];
  if (!card) return;
  try {
    const updated = await api.updateCard(card.id, { done: !card.done });
    cards[idx].done = updated.done;
    renderCard();
  } catch (e) { showToast(e.message, 'error'); }
}

/* ── Pomodoro ──────────────────────────────── */
function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false; isWork = true;
  secondsLeft = workMin * 60;
  updateTimerDisplay();
  const btn = document.getElementById('btn-timer-toggle');
  if (btn) btn.textContent = '▶ Avvia';
}

function toggleTimer() {
  const btn = document.getElementById('btn-timer-toggle');
  if (isRunning) {
    clearInterval(timerInterval); isRunning = false;
    if (btn) btn.textContent = '▶ Riprendi';
  } else {
    isRunning = true;
    if (btn) btn.textContent = '⏸ Pausa';
    timerInterval = setInterval(tick, 1000);
  }
}

function tick() {
  if (secondsLeft <= 0) {
    isWork = !isWork;
    secondsLeft = (isWork ? workMin : breakMin) * 60;
    showToast(isWork ? '🍅 Inizia una nuova sessione!' : '☕ Pausa!', 'default');
  } else {
    secondsLeft--;
  }
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const s = (secondsLeft % 60).toString().padStart(2, '0');
  const displayEl = document.getElementById('timer-display');
  const modeEl    = document.getElementById('timer-mode');
  if (displayEl) displayEl.textContent = `${m}:${s}`;
  if (modeEl)    modeEl.textContent    = isWork ? 'Studio' : 'Pausa';
}
