-- Migration 0010 (1.5.0): Intake database, founder side. Forms and responses are permanent tables.
-- link_hash is for the later private-link door and stays empty in 1.5.0.
CREATE TABLE IF NOT EXISTS intake_forms (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  about TEXT,
  audience TEXT NOT NULL DEFAULT 'founder',
  status TEXT NOT NULL DEFAULT 'open',
  fields TEXT NOT NULL DEFAULT '[]',
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS intake_responses (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL,
  who TEXT NOT NULL,
  answers TEXT NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'founder',
  link_hash TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS intake_resp_form ON intake_responses(form_id, created_at);
