-- server/drizzle/0010_free_meals.sql
-- Complimentary means free again: senior staff such as the MD and CEO eat on
-- the company. The meal still counts as food cooked, it just bills nothing.
--
-- Earlier rows for these people were charged under the "everyone pays" rule,
-- so they are zeroed here and every running balance is rebuilt from the
-- ledger. Safe to run more than once.

BEGIN;

UPDATE meal_attendance a
SET amount = 0, charged = true, updated_at = now()
FROM clients c
WHERE c.id = a.client_id
  AND c.meal_benefit = 'Complimentary'
  AND a.amount > 0;

UPDATE orders o
SET amount = 0, payment_method = 'complimentary', updated_at = now()
FROM clients c
WHERE c.id = o.client_id
  AND c.meal_benefit = 'Complimentary'
  AND o.amount > 0;

UPDATE clients c
SET monthly_bill = COALESCE((
      SELECT sum(a.amount) FROM meal_attendance a
      WHERE a.client_id = c.id AND a.status IN ('collected','no_show')
    ), 0),
    updated_at = now();

COMMIT;