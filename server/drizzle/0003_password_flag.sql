-- server/drizzle/0003_password_flag.sql
-- Only bulk-imported accounts should be forced through the set-password
-- screen, because only their temporary password (their own email) is
-- guessable. Every other account is created with a real generated password
-- that is shown once, so forcing a change adds friction without adding safety.
--
-- The column defaulted to true, which silently applied the lock to seeded
-- accounts and to clients created one-by-one as well.

BEGIN;

ALTER TABLE users
  ALTER COLUMN must_change_password SET DEFAULT false;

-- Clears the flag from every account created before the default was fixed.
-- Safe to run repeatedly; bulk-imported accounts created AFTER this migration
-- set the flag explicitly at insert time and are unaffected.
UPDATE users
SET must_change_password = false
WHERE must_change_password = true;

COMMIT;