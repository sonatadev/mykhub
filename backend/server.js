const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const WebSocket  = require('ws');
const jwt        = require('jsonwebtoken');
const { initDb, getDb } = require('./db/database');
const { JWT_SECRET }    = require('./middleware/auth');

const authRoutes   = require('./routes/auth');
const cardsRoutes  = require('./routes/cards');
const exportRoutes = require('./routes/export');
const spacesRoutes = require('./routes/spaces');
const pagesRoutes  = require('./routes/pages');
const usersRoutes  = require('./routes/users');
const publicRoutes = require('./routes/public');
const collabRoutes  = require('./routes/collab');
const uploadRoutes  = require('./routes/upload');

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth',   authRoutes);
app.use('/api/cards',  cardsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/spaces', spacesRoutes);
app.use('/api/pages',  pagesRoutes);
app.use('/api/users',  usersRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/collab', collabRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/uploads',    express.static(UPLOAD_DIR));

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Errore interno' });
});

// ── Y.js WebSocket collaboration server ───────────────────────────────────

const MSG_SYNC      = 0;
const MSG_AWARENESS = 1;

// In-memory map: docName → WSSharedDoc
const ydocs = new Map();

function extractPageId(docName) {
  const m = docName.match(/^page-(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

async function createCollabHandler() {
  const [Y, encoding, decoding, syncProtocol, awarenessProtocol] = await Promise.all([
    import('yjs'),
    import('lib0/encoding'),
    import('lib0/decoding'),
    import('y-protocols/sync'),
    import('y-protocols/awareness'),
  ]);

  // ── WSSharedDoc ─────────────────────────────────────────────────────────
  class WSSharedDoc extends Y.Doc {
    constructor(name) {
      super({ gc: true });
      this.name      = name;
      this.conns     = new Map();  // ws → Set<clientId>
      this.awareness = new awarenessProtocol.Awareness(this);

      // Load persisted Y.js state from SQLite
      const pageId = extractPageId(name);
      if (pageId) {
        const row = getDb().prepare('SELECT ydoc_state FROM pages WHERE id = ?').get(pageId);
        if (row?.ydoc_state) {
          try { Y.applyUpdate(this, new Uint8Array(row.ydoc_state)); }
          catch (e) { console.error('Error applying ydoc state', pageId, e); }
        }
      }

      // Awareness changes → broadcast
      this.awareness.on('update', ({ added, updated, removed }, origin) => {
        const changed = [...added, ...updated, ...removed];
        if (origin instanceof WebSocket) {
          const ids = this.conns.get(origin);
          if (ids) {
            added.forEach(id => ids.add(id));
            removed.forEach(id => ids.delete(id));
          }
        }
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, MSG_AWARENESS);
        encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed));
        const buf = encoding.toUint8Array(enc);
        this.conns.forEach((_, ws) => _send(ws, buf));
      });

      // Y.Doc updates → broadcast + debounced persist
      let saveTimer;
      this.on('update', (update, origin) => {
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, MSG_SYNC);
        syncProtocol.writeUpdate(enc, update);
        const buf = encoding.toUint8Array(enc);
        this.conns.forEach((_, ws) => {
          if (ws !== origin) _send(ws, buf);
        });

        const pid = extractPageId(this.name);
        if (pid) {
          clearTimeout(saveTimer);
          saveTimer = setTimeout(() => _persistDoc(this, pid), 3000);
        }
      });
    }
  }

  function _send(ws, buf) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(buf); }
      catch (e) { _closeConn(ydocs.get(ws.__docName), ws); }
    }
  }

  function _persistDoc(doc, pageId) {
    try {
      const state = Buffer.from(Y.encodeStateAsUpdate(doc));
      getDb()
        .prepare("UPDATE pages SET ydoc_state = ?, updated_at = datetime('now') WHERE id = ?")
        .run(state, pageId);
    } catch (e) { console.error('Error persisting ydoc', pageId, e); }
  }

  function _closeConn(doc, ws) {
    if (!doc || !doc.conns.has(ws)) return;
    const clientIds = doc.conns.get(ws);
    doc.conns.delete(ws);
    awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(clientIds), null);

    if (doc.conns.size === 0) {
      // Final persist then evict from memory
      const pageId = extractPageId(doc.name);
      if (pageId) _persistDoc(doc, pageId);
      ydocs.delete(doc.name);
      doc.destroy();
    }
    ws.close();
  }

  function _getDoc(docName) {
    if (!ydocs.has(docName)) {
      const doc = new WSSharedDoc(docName);
      ydocs.set(docName, doc);
    }
    return ydocs.get(docName);
  }

  // ── Public handler ───────────────────────────────────────────────────────
  return function handleCollabConnection(ws, docName) {
    ws.__docName = docName;
    ws.binaryType = 'arraybuffer';
    const doc = _getDoc(docName);
    doc.conns.set(ws, new Set());

    ws.on('message', (rawMsg) => {
      try {
        const msg     = new Uint8Array(rawMsg instanceof ArrayBuffer ? rawMsg : Buffer.from(rawMsg));
        const enc     = encoding.createEncoder();
        const dec     = decoding.createDecoder(msg);
        const msgType = decoding.readVarUint(dec);

        if (msgType === MSG_SYNC) {
          encoding.writeVarUint(enc, MSG_SYNC);
          syncProtocol.readSyncMessage(dec, enc, doc, ws);
          if (encoding.length(enc) > 1) _send(ws, encoding.toUint8Array(enc));
        } else if (msgType === MSG_AWARENESS) {
          awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(dec), ws);
        }
      } catch (e) {
        console.error('Collab WS message error:', e);
      }
    });

    ws.on('close', () => _closeConn(doc, ws));
    ws.on('error', (e) => { console.error('Collab WS error:', e); _closeConn(doc, ws); });

    // Send sync step 1 to bootstrap client
    {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MSG_SYNC);
      syncProtocol.writeSyncStep1(enc, doc);
      _send(ws, encoding.toUint8Array(enc));
    }

    // Send existing awareness states
    const states = doc.awareness.getStates();
    if (states.size > 0) {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MSG_AWARENESS);
      encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(states.keys())));
      _send(ws, encoding.toUint8Array(enc));
    }
  };
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  initDb();

  const handleCollabConnection = await createCollabHandler();

  const server = http.createServer(app);
  const wss    = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');

    if (!url.pathname.startsWith('/collab/')) {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    // JWT auth from query param
    const token = url.searchParams.get('token');
    let user;
    try {
      user = jwt.verify(token, JWT_SECRET);
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    // Room name: "page-{id}"
    const room = url.pathname.slice('/collab/'.length);
    const rm = room.match(/^page-(\d+)$/);
    if (!rm) { socket.destroy(); return; }
    const pageId = parseInt(rm[1], 10);

    // Access: space owner OR space member
    const db      = getDb();
    const page    = db.prepare('SELECT space_id FROM pages WHERE id = ?').get(pageId);
    if (!page) { socket.destroy(); return; }

    const isOwner  = db.prepare('SELECT id FROM spaces WHERE id = ? AND user_id = ?').get(page.space_id, user.id);
    const isMember = db.prepare('SELECT id FROM space_members WHERE space_id = ? AND user_id = ?').get(page.space_id, user.id);
    if (!isOwner && !isMember) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      handleCollabConnection(ws, room);
    });
  });

  server.listen(3000, '0.0.0.0', () => console.log('Backend on :3000'));
}

main().catch(err => {
  console.error('Startup failed:', err);
  process.exit(1);
});
