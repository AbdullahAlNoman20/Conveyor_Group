-- server/drizzle/0008_uniform_billing.sql
-- Every meal is charged at the day's price, whoever eats it.
--
-- Meal benefit used to decide whether a meal was free, which meant two people
-- eating the same food produced different statements. It is now a label on the
-- employee record and nothing more, so a statement always adds up to the meals
-- taken plus the meals wasted.
--
-- Only a cancelled day stays at zero, because nothing was cooked.

BEGIN;

-- Orders that were zeroed out because of the benefit, repriced to what the
-- dish actually cost on that day.
UPDATE orders o
SET amount = COALESCE(mi.price, 0),
    payment_method = 'salary',
    updated_at = now()
FROM order_items oi
LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
WHERE oi.order_id = o.id
  AND o.amount = 0
  AND o.status NOT IN ('cancelled','rejected')
  AND COALESCE(mi.price, 0) > 0;

-- The same for attendance rows, which is what the statement reads from.
UPDATE meal_attendance a
SET amount = COALESCE(o.amount, 0),
    charged = COALESCE(o.amount, 0) > 0,
    updated_at = now()
FROM orders o
WHERE o.id = a.order_id
  AND a.status = 'collected'
  AND a.amount = 0
  AND o.amount > 0;

-- Rebuild every running balance from the ledger, so the dashboard figure and
-- the statement total agree after the repricing above.
UPDATE clients c
SET monthly_bill = COALESCE((
      SELECT sum(a.amount)
      FROM meal_attendance a
      WHERE a.client_id = c.id
        AND a.status IN ('collected','no_show')
    ), 0),
    updated_at = now();

COMMIT;