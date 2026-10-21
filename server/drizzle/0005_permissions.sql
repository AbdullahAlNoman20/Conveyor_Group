-- server/drizzle/0005_permissions.sql
-- Per-user permission overrides on top of role defaults, plus the `accounts`
-- role that owns kitchen procurement.
--
-- An override row can GRANT a permission the role lacks or REVOKE one it has,
-- so a Manager can be handed one accounting duty without becoming an
-- accountant, and an accountant can be denied one without a new role.

BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_chk;
ALTER TABLE users
  ADD CONSTRAINT users_role_chk
  CHECK (role IN ('super_admin','manager','accounts','client'));

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission text NOT NULL,
  granted    boolean NOT NULL,
  note       text,
  granted_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission)
);

CREATE INDEX IF NOT EXISTS user_permissions_user_idx ON user_permissions (user_id);

COMMIT;