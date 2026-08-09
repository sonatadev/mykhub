const router = require('express').Router();
const crypto = require('crypto');
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');

router.use(auth);

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function validate(data, requireAll = false) {
  const errors = [];
  if (requireAll && !data.name?.trim()) errors.push('Il nome è obbligatorio');
  if (data.name   !== undefined && data.name.length > 100)           errors.push('Nome troppo lungo (max 100)');
  if (data.icon   !== undefined && data.icon.length > 12)            errors.push('Icona non valida');
  if (data.color  !== undefined && !COLOR_RE.test(data.color))       errors.push('Colore non valido');
  return errors;
}

// GET /api/spaces  — own spaces (role='owner') + shared spaces (role='member')
router.get('/', (req, res) => {
  const spaces = getDb().prepare(`
    SELECT s.*, 'owner' AS role FROM spaces s WHERE s.user_id = ?
    ORDER BY s.order_index ASC, s.id ASC
  `).all(req.user.id);

  const shared = getDb().prepare(`
    SELECT s.*, 'member' AS role FROM spaces s
    JOIN space_members sm ON sm.space_id = s.id
    WHERE sm.user_id = ?
    ORDER BY sm.created_at ASC
  `).all(req.user.id);

  res.json([...spaces, ...shared]);
});

// POST /api/spaces
router.post('/', (req, res) => {
  const errors = validate(req.body, true);
  if (errors.length) return res.status(400).json({ error: errors[0] });

  const { name, icon = '📁', color = '#6366f1' } = req.body;
  const db = getDb();
  const { m } = db.prepare('SELECT COALESCE(MAX(order_index), -1) AS m FROM spaces WHERE user_id = ?').get(req.user.id);
  const result = db.prepare('INSERT INTO spaces (user_id, name, icon, color, order_index) VALUES (?, ?, ?, ?, ?)').run(req.user.id, name.trim(), icon, color, m + 1);
  res.status(201).json(db.prepare('SELECT * FROM spaces WHERE id = ?').get(result.lastInsertRowid));
});

// POST /api/spaces/reorder — must come before /:id
router.post('/reorder', (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'Formato non valido' });
  const db = getDb();
  const upd = db.prepare('UPDATE spaces SET order_index = ? WHERE id = ? AND user_id = ?');
  db.transaction(() => { for (const { id, order_index } of order) upd.run(order_index, id, req.user.id); })();
  res.json({ ok: true });
});

// PATCH /api/spaces/:id
router.patch('/:id', (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM spaces WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id))
    return res.status(404).json({ error: 'Spazio non trovato' });

  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ error: errors[0] });

  const b = req.body;
  db.prepare(`UPDATE spaces SET name = COALESCE(?, name), icon = COALESCE(?, icon), color = COALESCE(?, color), order_index = COALESCE(?, order_index) WHERE id = ? AND user_id = ?`)
    .run(b.name?.trim() ?? null, b.icon ?? null, b.color ?? null, b.order_index ?? null, req.params.id, req.user.id);
  res.json(db.prepare('SELECT * FROM spaces WHERE id = ?').get(req.params.id));
});

// DELETE /api/spaces/:id
router.delete('/:id', (req, res) => {
  const r = getDb().prepare('DELETE FROM spaces WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!r.changes) return res.status(404).json({ error: 'Spazio non trovato' });
  res.json({ ok: true });
});

// POST /api/spaces/:id/share  — generate or return existing token
router.post('/:id/share', (req, res) => {
  const db = getDb();
  const space = db.prepare('SELECT id, share_token FROM spaces WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!space) return res.status(404).json({ error: 'Spazio non trovato' });
  const token = space.share_token || crypto.randomBytes(16).toString('hex');
  if (!space.share_token) db.prepare('UPDATE spaces SET share_token = ? WHERE id = ?').run(token, req.params.id);
  res.json({ token });
});

// DELETE /api/spaces/:id/share  — revoke
router.delete('/:id/share', (req, res) => {
  const db = getDb();
  const space = db.prepare('SELECT id FROM spaces WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!space) return res.status(404).json({ error: 'Spazio non trovato' });
  db.prepare('UPDATE spaces SET share_token = NULL WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
