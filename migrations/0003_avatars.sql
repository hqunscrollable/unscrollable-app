-- Migration 003 (1.2.0): profile photos for leads and Watchlist people.
ALTER TABLE leads ADD COLUMN avatar_v TEXT;
ALTER TABLE leads ADD COLUMN avatar_try TEXT;
ALTER TABLE watchlist ADD COLUMN avatar_v TEXT;
ALTER TABLE watchlist ADD COLUMN avatar_try TEXT;
CREATE TABLE avatars (
  kind TEXT NOT NULL,          -- lead or watch
  id TEXT NOT NULL,
  mime TEXT NOT NULL,
  data TEXT NOT NULL,          -- base64
  updated_at TEXT NOT NULL,
  PRIMARY KEY (kind, id)
);
