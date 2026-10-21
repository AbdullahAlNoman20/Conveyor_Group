-- server/drizzle/0006_staff_meals.sql
-- Managers and Accounts staff eat the daily meal too, so they need a client
-- row like anyone else.
--
-- Giving them a real client row rather than a special case means the whole
-- existing machinery applies to them unchanged: a QR token, the cancel
-- window, the no-show charge, the monthly statement, and the headcount the
-- kitchen cooks to.

BEGIN;

INSERT INTO clients (
  id, user_id, name, employee_id, email, phone, department, designation,
  employment_type, meal_plan, meal_benefit, qr_status, qr_token, status
)
SELECT
  'C-' || upper(substring(md5(u.id) for 8)),
  u.id,
  u.name,
  -- Prefixed so a staff meal account can never collide with an HR employee id.
  'STF-' || upper(substring(md5(u.id) for 6)),
  u.email,
  u.phone,
  COALESCE(u.department, 'Restaurant Operations'),
  COALESCE(u.designation, 'Staff'),
  'Company Employee',
  'Fixed Company Meal',
  -- Staff meals are covered by the company, so nothing is deducted.
  'Complimentary',
  'active',
  'QR-' || upper(replace(gen_random_uuid()::text, '-', '')),
  CASE WHEN u.status = 'active' THEN 'active' ELSE 'suspended' END
FROM users u
WHERE u.role IN ('manager', 'accounts')
  AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.user_id = u.id);

COMMIT;