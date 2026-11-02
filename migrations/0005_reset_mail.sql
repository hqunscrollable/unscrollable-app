-- 1.3.0: password reset by email. Marks which tokens were sent by mail and when, for rate limits.
ALTER TABLE reset_tokens ADD COLUMN created_at TEXT;
ALTER TABLE reset_tokens ADD COLUMN via TEXT;
CREATE INDEX idx_reset_mail ON reset_tokens(via, created_at);
