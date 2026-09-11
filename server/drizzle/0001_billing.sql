-- server/drizzle/0001_billing.sql
-- Per-client running bill. Orders add to it; cancelled/rejected orders
-- subtract from it. Idempotent so it can be re-applied safely.

BEGIN;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS monthly_bill numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_monthly_bill_chk;

ALTER TABLE clients
  ADD CONSTRAINT clients_monthly_bill_chk CHECK (monthly_bill >= 0);

COMMIT;