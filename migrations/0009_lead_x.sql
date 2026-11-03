-- Migration 0009 (1.3.5): X (Twitter) link for leads.
ALTER TABLE leads ADD COLUMN x_url TEXT;
