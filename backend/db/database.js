const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || '/app/data/mykhub.db';
let db;

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function runMigrations() {
  const userCols = db.pragma('table_info(users)').map(c => c.name);
  if (!userCols.includes('settings')) {
    db.exec("ALTER TABLE users ADD COLUMN settings TEXT NOT NULL DEFAULT '{}'");
    console.log('Migration: added users.settings');
  }

  const pageCols = db.pragma('table_info(pages)').map(c => c.name);
  if (!pageCols.includes('share_token')) {
    db.exec('ALTER TABLE pages ADD COLUMN share_token TEXT DEFAULT NULL');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_share_token ON pages(share_token) WHERE share_token IS NOT NULL');
    console.log('Migration: added pages.share_token');
  }
  if (!pageCols.includes('ydoc_state')) {
    db.exec('ALTER TABLE pages ADD COLUMN ydoc_state BLOB');
    console.log('Migration: added pages.ydoc_state');
  }

  const spaceCols = db.pragma('table_info(spaces)').map(c => c.name);
  if (!spaceCols.includes('share_token')) {
    db.exec('ALTER TABLE spaces ADD COLUMN share_token TEXT DEFAULT NULL');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_share_token ON spaces(share_token) WHERE share_token IS NOT NULL');
    console.log('Migration: added spaces.share_token');
  }

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  if (!tables.includes('space_members')) {
    db.exec(`CREATE TABLE space_members (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      space_id   INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invited_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(space_id, user_id)
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_space_members_space ON space_members(space_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_space_members_user  ON space_members(user_id)');
    console.log('Migration: created space_members');
  }
}

function initDb() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  runMigrations();

  console.log('DB ready:', DB_PATH);
  return db;
}

module.exports = { getDb, initDb };
