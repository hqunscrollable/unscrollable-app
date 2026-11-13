-- Migration 0012 (1.7.0): Clients. One row per client and a short history.
-- Delivery only. Money (price, payments, revenue share) lives in a separate Billing section later.
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  name TEXT NOT NULL,
  company TEXT,
  owner TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'onboarding',
  package TEXT,
  terms_status TEXT NOT NULL DEFAULT 'open',
  ball TEXT NOT NULL DEFAULT 'us',
  checklist TEXT NOT NULL DEFAULT '[0,0,0,0,0]',
  terms TEXT,
  pilot_start TEXT,
  pilot_end TEXT,
  next_step TEXT,
  next_checkin TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS clients_lead ON clients(lead_id) WHERE lead_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS client_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  at TEXT NOT NULL,
  kind TEXT NOT NULL,
  detail TEXT,
  by TEXT
);
CREATE INDEX IF NOT EXISTS client_ev_client ON client_events(client_id, id);
ALTER TABLE tasks ADD COLUMN client_id TEXT;
