-- Migration 002 (1.1.0): connection stages with Engage reminders, the Watchlist, settings, Claude access tokens.
ALTER TABLE leads ADD COLUMN sent_at TEXT;
ALTER TABLE leads ADD COLUMN accepted_at TEXT;
ALTER TABLE leads ADD COLUMN list TEXT NOT NULL DEFAULT 'icp';          -- icp, or any (not our ICP, but can afford the service, any industry)
ALTER TABLE leads ADD COLUMN industry TEXT;
ALTER TABLE leads ADD COLUMN engage_done TEXT NOT NULL DEFAULT '[]';   -- JSON list of touch numbers (1 to 5) done or skipped

CREATE TABLE watchlist (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'outlier',     -- outlier, icp, other
  owner TEXT NOT NULL,                      -- Tabish, Ali, Mehak
  active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  last_commented_at TEXT,                   -- YYYY-MM-DD, app timezone
  comment_count INTEGER NOT NULL DEFAULT 0,
  lead_id TEXT,                             -- set when promoted to a lead
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX watchlist_profile ON watchlist(profile_url);
CREATE INDEX watchlist_owner ON watchlist(owner, active, last_commented_at);

CREATE TABLE watch_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watch_id TEXT NOT NULL REFERENCES watchlist(id),
  day TEXT NOT NULL,                        -- YYYY-MM-DD, app timezone
  by TEXT NOT NULL,                         -- the founder who commented
  logged_by TEXT,                           -- who pressed the button
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX watch_comments_day ON watch_comments(day, by);

CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO app_settings(key, value) VALUES ('watch_target', '25');

CREATE TABLE claude_tokens (
  token_hash TEXT PRIMARY KEY,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  can_write INTEGER NOT NULL DEFAULT 0,
  revoked INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT
);

