const router = require('express').Router();
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');

router.use(auth);

// GET /api/export?subject=
router.get('/', (req, res) => {
  const { subject } = req.query;
  let sql = 'SELECT id, type, subject, topic, title, body, answer, done, created_at FROM cards WHERE user_id = ?';
  const params = [req.user.id];
  if (subject) { sql += ' AND subject = ?'; params.push(subject); }
  sql += ' ORDER BY created_at ASC';

  res.json({
    version: 1,
    exported_at: new Date().toISOString(),
    cards: getDb().prepare(sql).all(...params),
  });
});

// POST /api/export/import
router.post('/import', (req, res) => {
  const { cards } = req.body;
  if (!Array.isArray(cards)) return res.status(400).json({ error: 'Formato non valido: atteso array "cards"' });

  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO cards (user_id, type, subject, topic, title, body, answer, done, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const checkDup = db.prepare(
    'SELECT id FROM cards WHERE user_id = ? AND title = ? AND body = ? AND type = ?'
  );

  let imported = 0, skipped = 0;
  const run = db.transaction((cards) => {
    for (const c of cards) {
      if (!c.type || !c.subject || !c.title || !c.body) { skipped++; continue; }
      const dup = checkDup.get(req.user.id, c.title, c.body, c.type);
      if (dup) { skipped++; continue; }
      insert.run(
        req.user.id, c.type, c.subject, c.topic || null,
        c.title, c.body, c.answer || null,
        c.done ? 1 : 0,
        c.created_at || new Date().toISOString(),
        new Date().toISOString()
      );
      imported++;
    }
  });
  run(cards);

  res.json({ imported, skipped });
});

// GET /api/export/backup — full spaces + pages dump
router.get('/backup', (req, res) => {
  const db = getDb();
  const spaces = db.prepare(
    'SELECT id, name, icon, color, order_index FROM spaces WHERE user_id = ? ORDER BY order_index, id'
  ).all(req.user.id);
  const pages = db.prepare(
    'SELECT id, space_id, parent_page_id, title, content, icon, order_index FROM pages WHERE user_id = ? ORDER BY order_index, id'
  ).all(req.user.id);
  res.json({ version: 2, exported_at: new Date().toISOString(), spaces, pages });
});

// POST /api/export/restore — replace all spaces + pages from backup
router.post('/restore', (req, res) => {
  const { spaces, pages } = req.body;
  if (!Array.isArray(spaces) || !Array.isArray(pages))
    return res.status(400).json({ error: 'Formato non valido: attesi array "spaces" e "pages"' });

  const db = getDb();
  const run = db.transaction(() => {
    db.prepare('DELETE FROM spaces WHERE user_id = ?').run(req.user.id);

    const spaceIdMap = {};
    const insSpace = db.prepare(
      'INSERT INTO spaces (user_id, name, icon, color, order_index) VALUES (?, ?, ?, ?, ?)'
    );
    for (const s of spaces) {
      const r = insSpace.run(req.user.id, s.name || 'Spazio', s.icon || '📁', s.color || '#6366f1', s.order_index || 0);
      spaceIdMap[s.id] = r.lastInsertRowid;
    }

    const pageIdMap = {};
    const insPage = db.prepare(
      'INSERT INTO pages (user_id, space_id, parent_page_id, title, content, icon, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    let remaining = [...pages];
    for (let pass = 0; pass < 10 && remaining.length > 0; pass++) {
      const retry = [];
      for (const p of remaining) {
        const newSpaceId = spaceIdMap[p.space_id];
        if (!newSpaceId) continue;
        let newParentId = null;
        if (p.parent_page_id != null) {
          newParentId = pageIdMap[p.parent_page_id];
          if (newParentId == null) { retry.push(p); continue; }
        }
        const r = insPage.run(req.user.id, newSpaceId, newParentId, p.title || 'Senza titolo', p.content || '{}', p.icon || '📄', p.order_index || 0);
        pageIdMap[p.id] = r.lastInsertRowid;
      }
      remaining = retry;
    }
    return { spaces: Object.keys(spaceIdMap).length, pages: Object.keys(pageIdMap).length };
  });

  try {
    const counts = run();
    res.json({ ok: true, ...counts });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: 'Ripristino fallito: ' + err.message });
  }
});

module.exports = router;
