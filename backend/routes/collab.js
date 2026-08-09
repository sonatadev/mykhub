const router = require('express').Router();
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');

router.use(auth);

// GET /api/collab/spaces/:id/members
router.get('/spaces/:id/members', (req, res) => {
  const db = getDb();
  const space = db.prepare('SELECT id FROM spaces WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!space) return res.status(403).json({ error: 'Solo il proprietario può vedere i membri' });

  const members = db.prepare(`
    SELECT u.id, u.email, sm.created_at
    FROM space_members sm
    JOIN users u ON u.id = sm.user_id
    WHERE sm.space_id = ?
    ORDER BY sm.created_at ASC
  `).all(req.params.id);
  res.json(members);
});

// POST /api/collab/spaces/:id/members  — invite by email
router.post('/spaces/:id/members', (req, res) => {
  const db = getDb();
  const space = db.prepare('SELECT id FROM spaces WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!space) return res.status(403).json({ error: 'Solo il proprietario può invitare collaboratori' });

  const { email } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: 'Email richiesta' });

  const target = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!target) return res.status(404).json({ error: 'Nessun account trovato con questa email' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Non puoi invitare te stesso' });

  try {
    db.prepare('INSERT INTO space_members (space_id, user_id, invited_by) VALUES (?, ?, ?)').run(req.params.id, target.id, req.user.id);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Utente già collaboratore' });
    throw e;
  }
  res.status(201).json({ id: target.id, email: target.email });
});

// DELETE /api/collab/spaces/:id/members/:userId  — remove member (owner) or leave (self, use "me")
router.delete('/spaces/:id/members/:userId', (req, res) => {
  const db = getDb();
  const targetId = req.params.userId === 'me' ? req.user.id : parseInt(req.params.userId, 10);
  const isSelf   = targetId === req.user.id;
  const isOwner  = db.prepare('SELECT id FROM spaces WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

  if (!isSelf && !isOwner) return res.status(403).json({ error: 'Non autorizzato' });

  const r = db.prepare('DELETE FROM space_members WHERE space_id = ? AND user_id = ?').run(req.params.id, targetId);
  if (!r.changes) return res.status(404).json({ error: 'Membro non trovato' });
  res.json({ ok: true });
});

module.exports = router;
