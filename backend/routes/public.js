const router = require('express').Router();
const { getDb } = require('../db/database');

function parseContent(raw) {
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

// GET /api/public/:token  — no auth required
router.get('/:token', (req, res) => {
  const db = getDb();
  const page = db.prepare(`
    SELECT p.id, p.title, p.content, p.icon, p.space_id, p.parent_page_id, p.updated_at,
           s.name AS space_name, s.color AS space_color, s.icon AS space_icon
    FROM pages p
    JOIN spaces s ON s.id = p.space_id
    WHERE p.share_token = ?
  `).get(req.params.token);

  if (!page) return res.status(404).json({ error: 'Pagina non trovata o condivisione revocata' });

  // Build breadcrumb (ancestor titles)
  const breadcrumb = [];
  let cur = page;
  while (cur.parent_page_id) {
    const parent = db.prepare('SELECT id, title, parent_page_id FROM pages WHERE id = ?').get(cur.parent_page_id);
    if (!parent) break;
    breadcrumb.unshift(parent.title);
    cur = parent;
  }

  page.content = parseContent(page.content);
  page.breadcrumb = breadcrumb;
  res.json(page);
});

// GET /api/public/space/:token  — full space, no auth
router.get('/space/:token', (req, res) => {
  const db = getDb();
  const space = db.prepare('SELECT id, name, icon, color FROM spaces WHERE share_token = ?').get(req.params.token);
  if (!space) return res.status(404).json({ error: 'Spazio non trovato o condivisione revocata' });

  const pages = db.prepare(
    'SELECT id, parent_page_id, title, icon, order_index, content FROM pages WHERE space_id = ? ORDER BY order_index ASC, id ASC'
  ).all(space.id).map(p => ({ ...p, content: parseContent(p.content) }));

  res.json({ space, pages });
});

module.exports = router;
