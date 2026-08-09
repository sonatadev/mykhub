const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'mykhub-dev-secret-change-in-prod';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token non valido o scaduto' });
  }
}

module.exports = { auth, JWT_SECRET };
