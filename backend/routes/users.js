const router = require('express').Router();
const { getDb } = require('../db/database');
const { auth } = require('../middleware/auth');

router.use(auth);

const VALID_THEMES  = new Set(['light', 'dark', 'system', 'y2k']);
const VALID_FONTS   = new Set(['inter', 'georgia', 'jetbrains']);
const COLOR_RE      = /^#[0-9a-fA-F]{6}$/;

// GET /api/users/me
router.get('/me', (req, res) => {
  const user = getDb().prepare('SELECT id, email, settings, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utente non trovato' });
  try { user.settings = JSON.parse(user.settings || '{}'); } catch { user.settings = {}; }
  res.json(user);
});

// PATCH /api/users/settings
router.patch('/settings', (req, res) => {
  const { theme, accent, font, bgColor } = req.body;
  if (theme   !== undefined && !VALID_THEMES.has(theme))               return res.status(400).json({ error: 'Tema non valido' });
  if (font    !== undefined && !VALID_FONTS.has(font))                 return res.status(400).json({ error: 'Font non valido' });
  if (accent  !== undefined && !COLOR_RE.test(accent))                 return res.status(400).json({ error: 'Colore accent non valido' });
  if (bgColor !== undefined && bgColor !== null && !COLOR_RE.test(bgColor)) return res.status(400).json({ error: 'Colore sfondo non valido' });

  const db = getDb();
  const row = db.prepare('SELECT settings FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'Utente non trovato' });

  let current = {};
  try { current = JSON.parse(row.settings || '{}'); } catch {}
  const updated = {
    ...current,
    ...(theme   !== undefined && { theme }),
    ...(accent  !== undefined && { accent }),
    ...(font    !== undefined && { font }),
    ...(bgColor !== undefined && { bgColor }),
  };
  db.prepare('UPDATE users SET settings = ? WHERE id = ?').run(JSON.stringify(updated), req.user.id);
  res.json({ settings: updated });
});

module.exports = router;
