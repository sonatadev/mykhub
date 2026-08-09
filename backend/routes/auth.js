const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const { auth, JWT_SECRET } = require('../middleware/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
router.post('/register', (req, res) => {
  const email    = (req.body.email    || '').toLowerCase().trim();
  const password = (req.body.password || '').trim();

  if (!email || !password)        return res.status(400).json({ error: 'Email e password obbligatorie' });
  if (!EMAIL_RE.test(email))      return res.status(400).json({ error: 'Formato email non valido' });
  if (password.length < 6)        return res.status(400).json({ error: 'Password troppo corta (min 6 caratteri)' });
  if (password.length > 128)      return res.status(400).json({ error: 'Password troppo lunga (max 128 caratteri)' });

  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = getDb()
      .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
      .run(email, hash);
    const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, id: result.lastInsertRowid, email, settings: {} });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email già registrata' });
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const email    = (req.body.email    || '').toLowerCase().trim();
  const password = (req.body.password || '');

  if (!email || !password)   return res.status(400).json({ error: 'Email e password obbligatorie' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Formato email non valido' });

  const user = getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
  let settings = {};
  try { settings = JSON.parse(user.settings || '{}'); } catch {}
  res.json({ token, id: user.id, email: user.email, settings });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const user = getDb()
    .prepare('SELECT id, email, settings, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utente non trovato' });
  try { user.settings = JSON.parse(user.settings || '{}'); } catch { user.settings = {}; }
  res.json(user);
});

// PATCH /api/auth/settings
router.patch('/settings', auth, (req, res) => {
  const { dark_mode, pomodoro_work, pomodoro_break } = req.body;

  const w = pomodoro_work  !== undefined ? Number(pomodoro_work)  : null;
  const b = pomodoro_break !== undefined ? Number(pomodoro_break) : null;
  if (w !== null && (isNaN(w) || w < 1 || w > 120)) return res.status(400).json({ error: 'Durata studio non valida (1–120 min)' });
  if (b !== null && (isNaN(b) || b < 1 || b > 60))  return res.status(400).json({ error: 'Durata pausa non valida (1–60 min)' });

  getDb()
    .prepare(`UPDATE users SET
      dark_mode      = COALESCE(?, dark_mode),
      pomodoro_work  = COALESCE(?, pomodoro_work),
      pomodoro_break = COALESCE(?, pomodoro_break)
    WHERE id = ?`)
    .run(
      dark_mode !== undefined ? (dark_mode ? 1 : 0) : null,
      w, b,
      req.user.id
    );
  res.json({ ok: true });
});

module.exports = router;
