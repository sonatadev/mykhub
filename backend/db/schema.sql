CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    UNIQUE NOT NULL,
  password_hash TEXT    NOT NULL,
  settings      TEXT    NOT NULL DEFAULT '{}',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS spaces (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  icon        TEXT    NOT NULL DEFAULT '📁',
  color       TEXT    NOT NULL DEFAULT '#6366f1',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pages (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id       INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  parent_page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
  title          TEXT    NOT NULL DEFAULT 'Senza titolo',
  content        TEXT    NOT NULL DEFAULT '{}',
  icon           TEXT    NOT NULL DEFAULT '📄',
  order_index    INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Keep cards table: existing data preserved
CREATE TABLE IF NOT EXISTS cards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT    NOT NULL CHECK(type IN ('summary', 'qa', 'note')),
  subject     TEXT    NOT NULL,
  topic       TEXT,
  title       TEXT    NOT NULL,
  body        TEXT    NOT NULL,
  answer      TEXT,
  done        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cards_user    ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_subject ON cards(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_cards_type    ON cards(user_id, type);
CREATE INDEX IF NOT EXISTS idx_spaces_user   ON spaces(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_space   ON pages(space_id);
CREATE INDEX IF NOT EXISTS idx_pages_parent  ON pages(parent_page_id);
CREATE INDEX IF NOT EXISTS idx_pages_user    ON pages(user_id);
