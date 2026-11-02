-- 1.3.2: internal build notes (Tabish only).
CREATE TABLE IF NOT EXISTS dev_notes (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT 'Idea',
  pin INTEGER NOT NULL DEFAULT 0,
  author TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
