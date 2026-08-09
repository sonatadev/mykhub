const router = require('express').Router();
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');

router.use(auth);

const VALID_TYPES    = new Set(['summary', 'qa', 'note']);
const VALID_SUBJECTS = new Set(['Italiano', 'Inglese', 'Informatica', 'Sistemi e Reti']);
const MAX_TITLE  = 300;
const MAX_BODY   = 20000;
const MAX_TOPIC  = 100;
const MAX_ANSWER = 10000;

function validateCard(data, requireAll = false) {
  const { type, subject, topic, title, body, answer } = data;
  const errors = [];

  if (type    !== undefined && !VALID_TYPES.has(type))       errors.push(`Tipo non valido (attesi: ${[...VALID_TYPES].join(', ')})`);
  if (subject !== undefined && !VALID_SUBJECTS.has(subject)) errors.push(`Materia non valida (attese: ${[...VALID_SUBJECTS].join(', ')})`);
  if (title   !== undefined && title.trim().length === 0)    errors.push('Il titolo non può essere vuoto');
  if (title   !== undefined && title.length > MAX_TITLE)     errors.push(`Titolo troppo lungo (max ${MAX_TITLE} caratteri)`);
  if (body    !== undefined && body.trim().length === 0)     errors.push('Il contenuto non può essere vuoto');
  if (body    !== undefined && body.length > MAX_BODY)       errors.push(`Contenuto troppo lungo (max ${MAX_BODY} caratteri)`);
  if (topic   !== undefined && topic && topic.length > MAX_TOPIC)   errors.push(`Tag troppo lungo (max ${MAX_TOPIC} caratteri)`);
  if (answer  !== undefined && answer && answer.length > MAX_ANSWER) errors.push(`Risposta troppo lunga (max ${MAX_ANSWER} caratteri)`);

  if (requireAll) {
    if (!type)    errors.push('Il tipo è obbligatorio');
    if (!subject) errors.push('La materia è obbligatoria');
    if (!title)   errors.push('Il titolo è obbligatorio');
    if (!body)    errors.push('Il contenuto è obbligatorio');
  }

  return errors;
}

// GET /api/cards?subject=&type=&done=&topic=&q=
router.get('/', (req, res) => {
  const { subject, type, done, topic, q } = req.query;
  let sql = 'SELECT * FROM cards WHERE user_id = ?';
  const params = [req.user.id];

  if (subject)            { sql += ' AND subject = ?';                   params.push(subject); }
  if (type)               { sql += ' AND type = ?';                      params.push(type); }
  if (done !== undefined) { sql += ' AND done = ?';                      params.push(done === 'true' ? 1 : 0); }
  if (topic)              { sql += ' AND topic LIKE ?';                  params.push(`%${topic}%`); }
  if (q)                  { sql += ' AND (title LIKE ? OR body LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }

  sql += ' ORDER BY created_at DESC';
  res.json(getDb().prepare(sql).all(...params));
});

// POST /api/cards
router.post('/', (req, res) => {
  const errors = validateCard(req.body, true);
  if (errors.length) return res.status(400).json({ error: errors[0] });

  const { type, subject, topic, title, body, answer } = req.body;
  const result = getDb()
    .prepare('INSERT INTO cards (user_id, type, subject, topic, title, body, answer) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(req.user.id, type, subject, topic?.trim() || null, title.trim(), body.trim(), answer?.trim() || null);

  res.status(201).json(getDb().prepare('SELECT * FROM cards WHERE id = ?').get(result.lastInsertRowid));
});

// PATCH /api/cards/:id
router.patch('/:id', (req, res) => {
  const db = getDb();
  const card = db.prepare('SELECT id FROM cards WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!card) return res.status(404).json({ error: 'Scheda non trovata' });

  const errors = validateCard(req.body, false);
  if (errors.length) return res.status(400).json({ error: errors[0] });

  const b = req.body;
  const doneVal = b.done !== undefined ? (b.done ? 1 : 0) : null;

  db.prepare(`UPDATE cards SET
    type    = COALESCE(?, type),
    subject = COALESCE(?, subject),
    topic   = COALESCE(?, topic),
    title   = COALESCE(?, title),
    body    = COALESCE(?, body),
    answer  = COALESCE(?, answer),
    done    = COALESCE(?, done),
    updated_at = datetime('now')
  WHERE id = ? AND user_id = ?`).run(
    b.type    ?? null, b.subject ?? null, b.topic?.trim() ?? null,
    b.title?.trim() ?? null, b.body?.trim() ?? null, b.answer?.trim() ?? null,
    doneVal,
    req.params.id, req.user.id
  );

  res.json(db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id));
});

// DELETE /api/cards/:id
router.delete('/:id', (req, res) => {
  const result = getDb()
    .prepare('DELETE FROM cards WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: 'Scheda non trovata' });
  res.json({ ok: true });
});

module.exports = router;
