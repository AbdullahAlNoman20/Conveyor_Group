-- backend/drizzle/0000_init.sql
BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  password_hash text NOT NULL,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  department text,
  designation text,
  employee_id text,
  employment_type text,
  meal_plan text,
  meal_benefit text,
  avatar_color text,
  photo_path text,
  must_change_password boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_role_chk   CHECK (role IN ('super_admin','manager','client')),
  CONSTRAINT users_status_chk CHECK (status IN ('active','suspended','disabled'))
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq ON users (lower(email));
CREATE INDEX IF NOT EXISTS users_role_status_idx ON users (role, status);

CREATE TABLE IF NOT EXISTS clients (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE RESTRICT,
  name text NOT NULL,
  employee_id text NOT NULL,
  email text,
  phone text,
  department text,
  designation text,
  employment_type text NOT NULL DEFAULT 'Company Employee',
  meal_plan text NOT NULL DEFAULT 'Fixed Company Meal',
  meal_benefit text NOT NULL DEFAULT 'Self Paid',
  supporting_document_path text,
  supporting_document_name text,
  qr_status text NOT NULL DEFAULT 'active',
  qr_token text NOT NULL,
  qr_issued_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  prev_status text,
  photo_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clients_status_chk          CHECK (status IN ('active','suspended','archived')),
  CONSTRAINT clients_qr_status_chk       CHECK (qr_status IN ('active','expired')),
  CONSTRAINT clients_meal_plan_chk       CHECK (meal_plan IN ('Fixed Company Meal')),
  CONSTRAINT clients_meal_benefit_chk    CHECK (meal_benefit IN ('Company Subsidized','Complimentary','Self Paid')),
  CONSTRAINT clients_employment_type_chk CHECK (employment_type IN ('Company Employee','External Client','Contractor','Temporary Employee'))
);
CREATE UNIQUE INDEX IF NOT EXISTS clients_employee_id_uq ON clients (employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS clients_qr_token_uq    ON clients (qr_token);
CREATE UNIQUE INDEX IF NOT EXISTS clients_user_id_uq     ON clients (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX        IF NOT EXISTS clients_status_idx     ON clients (status);
CREATE INDEX        IF NOT EXISTS clients_name_idx       ON clients (lower(name));

CREATE TABLE IF NOT EXISTS managers (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE RESTRICT,
  name text NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS managers_email_uq ON managers (lower(email));

CREATE TABLE IF NOT EXISTS menu_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  price numeric(10,2) NOT NULL,
  available boolean NOT NULL DEFAULT true,
  description text,
  spice_level text,
  calories integer,
  allergens text[] NOT NULL DEFAULT '{}'::text[],
  image_path text,
  image_name text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT menu_items_category_chk CHECK (category IN ('Fixed Meal','Custom Menu','Beverage','Evening Snack')),
  CONSTRAINT menu_items_price_chk CHECK (price > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS menu_items_name_uq ON menu_items (lower(name)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS menu_items_category_available_idx ON menu_items (category, available);

CREATE TABLE IF NOT EXISTS weekly_menu (
  day text PRIMARY KEY,
  meal_name text NOT NULL,
  menu_item_id text REFERENCES menu_items(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT weekly_menu_day_chk CHECK (day IN ('Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'))
);

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  client_id text NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  client_name text NOT NULL,
  employee_id text,
  department text,
  table_number integer,
  order_type text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  special_instructions text,
  amount numeric(12,2) NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL,
  self_placed boolean NOT NULL DEFAULT false,
  instant_order boolean NOT NULL DEFAULT false,
  consumed_meal_slot boolean NOT NULL DEFAULT false,
  order_date date NOT NULL,
  placed_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_status_chk   CHECK (status IN ('awaiting_manager','pending','accepted','preparing','ready','completed','delayed','cancelled','rejected')),
  CONSTRAINT orders_type_chk     CHECK (order_type IN ('dine_in','take_away','self_order')),
  CONSTRAINT orders_priority_chk CHECK (priority IN ('normal','high','urgent')),
  CONSTRAINT orders_payment_chk  CHECK (payment_method IN ('salary','complimentary')),
  CONSTRAINT orders_amount_chk   CHECK (amount >= 0),
  CONSTRAINT orders_table_chk    CHECK (table_number IS NULL OR table_number > 0)
);

-- ONE MEAL PER DAY, enforced by the database itself (not just app logic).
CREATE UNIQUE INDEX IF NOT EXISTS orders_one_meal_per_day_uq
  ON orders (client_id, order_date)
  WHERE status NOT IN ('cancelled','rejected');

CREATE INDEX IF NOT EXISTS orders_date_status_idx ON orders (order_date, status);
CREATE INDEX IF NOT EXISTS orders_client_id_idx   ON orders (client_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx  ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_active_today_idx
  ON orders (order_date, created_at)
  WHERE status IN ('awaiting_manager','pending','accepted','preparing','ready','delayed');

CREATE TABLE IF NOT EXISTS order_items (
  id serial PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id text REFERENCES menu_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  qty integer NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  CONSTRAINT order_items_qty_chk CHECK (qty > 0)
);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);

CREATE TABLE IF NOT EXISTS account_requests (
  id text PRIMARY KEY,
  photo_path text,
  name text NOT NULL,
  employee_id text NOT NULL,
  email text NOT NULL,
  phone text,
  department text NOT NULL,
  designation text,
  employment_type text NOT NULL DEFAULT 'Company Employee',
  meal_plan text NOT NULL DEFAULT 'Fixed Company Meal',
  meal_benefit text NOT NULL DEFAULT 'Self Paid',
  supporting_document_path text,
  supporting_document_name text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  decided_by text REFERENCES users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_requests_status_chk CHECK (status IN ('pending','approved','rejected'))
);
CREATE INDEX IF NOT EXISTS account_requests_status_idx ON account_requests (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS account_requests_pending_emp_uq
  ON account_requests (lower(employee_id)) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  event text NOT NULL,
  message text NOT NULL,
  recipient_roles text[] NOT NULL DEFAULT '{}'::text[],
  recipient_user_ids text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_ids_gin  ON notifications USING gin (recipient_user_ids);
CREATE INDEX IF NOT EXISTS notifications_roles_gin     ON notifications USING gin (recipient_roles);

CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id text NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE IF NOT EXISTS settings (
  id integer PRIMARY KEY DEFAULT 1,
  restaurant_name text NOT NULL DEFAULT 'Conveyor Group Restaurant',
  invoice_prefix text NOT NULL DEFAULT 'INV',
  email_notifications boolean NOT NULL DEFAULT true,
  sms_notifications boolean NOT NULL DEFAULT false,
  display_name_on_board text NOT NULL DEFAULT 'token_only',
  self_order_station_code text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settings_singleton_chk CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS meal_limits (
  date date PRIMARY KEY,
  daily_limit integer NOT NULL,
  served integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meal_limits_served_chk CHECK (served >= 0)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  user_agent text,
  ip text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens (user_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id text NOT NULL,
  actor_id text,
  actor_role text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  before jsonb,
  after jsonb,
  ip text,
  user_agent text,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
CREATE TABLE IF NOT EXISTS audit_logs_default PARTITION OF audit_logs DEFAULT;
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity, entity_id, created_at DESC);
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;

CREATE TABLE IF NOT EXISTS storage_objects (
  path text PRIMARY KEY,
  bucket text NOT NULL,
  owner_entity text,
  owner_id text,
  orphaned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS storage_objects_orphaned_idx ON storage_objects (orphaned_at) WHERE orphaned_at IS NOT NULL;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_diner_summary AS
SELECT o.order_date, o.client_id,
       max(o.client_name) AS client_name,
       count(*)::int      AS orders_count,
       sum(o.amount)      AS total_amount
FROM orders o
WHERE o.status NOT IN ('cancelled','rejected')
GROUP BY o.order_date, o.client_id;
CREATE UNIQUE INDEX IF NOT EXISTS mv_daily_diner_summary_uq ON mv_daily_diner_summary (order_date, client_id);

COMMIT;