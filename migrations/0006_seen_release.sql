-- 1.3.1: remembers the last release each person has read, for the What's new banner.
ALTER TABLE users ADD COLUMN seen_release TEXT;
