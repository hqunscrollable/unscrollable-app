-- Unscrollable master app, migration 001. Sprint 1 tables.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  login_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'founder',
  is_dev INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  last_seen TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE credentials (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  iterations INTEGER NOT NULL,
  totp_secret_enc TEXT,
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  must_reset INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ua TEXT
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE TABLE flags (key TEXT PRIMARY KEY, on_back INTEGER NOT NULL DEFAULT 1);
CREATE TABLE integrations (
  key TEXT PRIMARY KEY, last_run_at TEXT, last_error TEXT, expires_on TEXT
);
CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  actor TEXT, action TEXT NOT NULL, entity TEXT, entity_id TEXT, detail TEXT
);
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',      -- todo, doing, blocked, done
  owner TEXT NOT NULL DEFAULT 'Tabish',     -- Tabish, Ali, Mehak, Everyone
  priority TEXT NOT NULL DEFAULT 'normal',  -- high, normal, low
  area TEXT,
  due TEXT,
  notes TEXT,
  checks TEXT NOT NULL DEFAULT '[]',
  comments TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  done_at TEXT
);
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  profile_url TEXT,
  company TEXT,
  owner TEXT NOT NULL,                      -- Tabish, Ali, Mehak
  stage TEXT NOT NULL DEFAULT 'comment',    -- comment, dm, guide, pitched, booked, away
  away_reason TEXT,                         -- no reply, not ICP, no budget, timing, other
  tag TEXT NOT NULL DEFAULT 'quiet',        -- hot, warm, quiet
  funnel_start TEXT,
  last_action_at TEXT,
  next_action TEXT,
  next_due TEXT,
  why_fit TEXT,
  notes TEXT,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX leads_profile ON leads(profile_url) WHERE profile_url IS NOT NULL AND profile_url <> '';
CREATE TABLE lead_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  at TEXT NOT NULL DEFAULT (datetime('now')),
  kind TEXT NOT NULL, detail TEXT, by TEXT
);
CREATE TABLE radar_items (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  area TEXT,
  state TEXT NOT NULL DEFAULT 'now',        -- now, waiting, parked, stale
  owner TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO flags(key) VALUES ('home'),('leads'),('followups'),('tasks'),('developer');
