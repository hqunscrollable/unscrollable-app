-- Migration 004 (1.2.3): one-time recovery codes for two-factor, and remembered devices (skip the code for 30 days).
CREATE TABLE recovery_codes (
  code_hash TEXT PRIMARY KEY,                 -- sha256 of user id + code. The code itself is never stored.
  user_id TEXT NOT NULL REFERENCES users(id),
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX recovery_user ON recovery_codes(user_id);
CREATE TABLE trusted_devices (
  token_hash TEXT PRIMARY KEY,                -- sha256 of the device cookie value
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  ua TEXT
);
CREATE INDEX trusted_user ON trusted_devices(user_id);
