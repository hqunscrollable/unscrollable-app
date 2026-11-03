-- Migration 008 (1.3.4): a profile photo for each signed-in person. Photos live in the avatars table with kind 'user'.
ALTER TABLE users ADD COLUMN avatar_v TEXT;
