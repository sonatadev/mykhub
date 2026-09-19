const router = require('express').Router();
const { auth } = require('../middleware/auth');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Extension is derived from the (server-checked) mimetype, never from the
// client-supplied filename/content-type pair — this also excludes SVG,
// which browsers can execute as a script when opened directly, unlike the
// raster formats below.
const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/gif':  '.gif',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    cb(null, crypto.randomBytes(16).toString('hex') + MIME_EXT[file.mimetype]);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!MIME_EXT[file.mimetype]) return cb(new Error('Formato non supportato (jpg, png, gif, webp)'));
    cb(null, true);
  },
});

router.post('/', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nessun file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

module.exports = router;
