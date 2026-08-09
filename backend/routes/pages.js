const router = require('express').Router();
const crypto = require('crypto');
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');

router.use(auth);

function parseContent(raw) {
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

// Returns true if user owns the space or is a member
function canAccessSpace(db, spaceId, userId) {
  const isOwner  = db.prepare('SELECT id FROM spaces WHERE id = ? AND user_id = ?').get(spaceId, userId);
  const isMember = db.prepare('SELECT id FROM space_members WHERE space_id = ? AND user_id = ?').get(spaceId, userId);
  return !!(isOwner || isMember);
}

// GET /api/pages?space_id=X
router.get('/', (req, res) => {
  const { space_id } = req.query;
  if (!space_id) return res.status(400).json({ error: 'space_id richiesto' });
  const db = getDb();
  if (!canAccessSpace(db, space_id, req.user.id))
    return res.status(404).json({ error: 'Spazio non trovato' });

  const pages = db
    .prepare('SELECT id, space_id, parent_page_id, title, icon, order_index, created_at, updated_at FROM pages WHERE space_id = ? ORDER BY order_index ASC, id ASC')
    .all(space_id);
  res.json(pages);
});

// POST /api/pages  — owner or member
router.post('/', (req, res) => {
  const { space_id, parent_page_id = null, title = 'Senza titolo', icon = '📄' } = req.body;
  if (!space_id) return res.status(400).json({ error: 'space_id richiesto' });
  const db = getDb();
  if (!canAccessSpace(db, space_id, req.user.id))
    return res.status(404).json({ error: 'Spazio non trovato' });
  if (parent_page_id && !db.prepare('SELECT id FROM pages WHERE id = ? AND space_id = ?').get(parent_page_id, space_id))
    return res.status(404).json({ error: 'Pagina parent non trovata' });

  const { m } = db.prepare('SELECT COALESCE(MAX(order_index), -1) AS m FROM pages WHERE space_id = ? AND parent_page_id IS ?').get(space_id, parent_page_id);
  const result = db.prepare('INSERT INTO pages (user_id, space_id, parent_page_id, title, content, icon, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(req.user.id, space_id, parent_page_id, title.trim(), '{}', icon, m + 1);
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(result.lastInsertRowid);
  page.content = parseContent(page.content);
  res.status(201).json(page);
});

// POST /api/pages/reorder  — owner or member
router.post('/reorder', (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'Formato non valido' });
  const db = getDb();
  const getPage = db.prepare('SELECT space_id FROM pages WHERE id = ?');
  const upd     = db.prepare('UPDATE pages SET order_index = ?, parent_page_id = ? WHERE id = ?');
  db.transaction(() => {
    for (const { id, order_index, parent_page_id = null } of order) {
      const page = getPage.get(id);
      if (page && canAccessSpace(db, page.space_id, req.user.id))
        upd.run(order_index, parent_page_id, id);
    }
  })();
  res.json({ ok: true });
});

// GET /api/pages/:id  — owner or member
router.get('/:id', (req, res) => {
  const db = getDb();
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!page) return res.status(404).json({ error: 'Pagina non trovata' });
  if (!canAccessSpace(db, page.space_id, req.user.id))
    return res.status(404).json({ error: 'Pagina non trovata' });
  page.content = parseContent(page.content);
  if (page.ydoc_state) page.ydoc_state = Buffer.from(page.ydoc_state).toString('base64');
  res.json(page);
});

// POST /api/pages/:id/share  — owner only
router.post('/:id/share', (req, res) => {
  const db = getDb();
  const page = db.prepare('SELECT id, share_token FROM pages WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!page) return res.status(404).json({ error: 'Pagina non trovata' });
  const token = page.share_token || crypto.randomBytes(16).toString('hex');
  if (!page.share_token) db.prepare('UPDATE pages SET share_token = ? WHERE id = ?').run(token, req.params.id);
  res.json({ token });
});

// DELETE /api/pages/:id/share  — owner only
router.delete('/:id/share', (req, res) => {
  const db = getDb();
  const page = db.prepare('SELECT id FROM pages WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!page) return res.status(404).json({ error: 'Pagina non trovata' });
  db.prepare('UPDATE pages SET share_token = NULL WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// PATCH /api/pages/:id  — owner or member
router.patch('/:id', (req, res) => {
  const db = getDb();
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!page) return res.status(404).json({ error: 'Pagina non trovata' });
  if (!canAccessSpace(db, page.space_id, req.user.id))
    return res.status(403).json({ error: 'Non autorizzato' });

  const b = req.body;
  const contentStr = b.content !== undefined
    ? (typeof b.content === 'string' ? b.content : JSON.stringify(b.content))
    : null;

  db.prepare(`UPDATE pages SET
    title       = COALESCE(?, title),
    content     = COALESCE(?, content),
    icon        = COALESCE(?, icon),
    order_index = COALESCE(?, order_index),
    updated_at  = datetime('now')
  WHERE id = ?`).run(
    b.title?.trim() ?? null, contentStr, b.icon ?? null, b.order_index ?? null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  updated.content = parseContent(updated.content);
  res.json(updated);
});

// DELETE /api/pages/:id  — owner or member
router.delete('/:id', (req, res) => {
  const db = getDb();
  const page = db.prepare('SELECT space_id FROM pages WHERE id = ?').get(req.params.id);
  if (!page) return res.status(404).json({ error: 'Pagina non trovata' });
  if (!canAccessSpace(db, page.space_id, req.user.id))
    return res.status(403).json({ error: 'Non autorizzato' });
  db.prepare('DELETE FROM pages WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
