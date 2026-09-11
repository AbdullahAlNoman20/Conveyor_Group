-- server/drizzle/0002_attendance.sql
-- Daily meal attendance. One row per (client, date).
--
-- Every active Fixed-Meal client is implicitly opted in each day. They may
-- cancel before the cutoff; if they neither cancel nor collect, the nightly
-- sweep marks them no_show and charges them.

BEGIN;

CREATE TABLE IF NOT EXISTS meal_attendance (
  date          date NOT NULL,
  client_id     text NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  client_name   text NOT NULL,
  employee_id   text,
  department    text,
  status        text NOT NULL DEFAULT 'pending',
  order_id      text REFERENCES orders(id) ON DELETE SET NULL,
  amount        numeric(12,2) NOT NULL DEFAULT 0,
  -- Guards the nightly sweep against double-charging if it ever re-runs.
  charged       boolean NOT NULL DEFAULT false,
  cancelled_at  timestamptz,
  decided_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (date, client_id),
  CONSTRAINT meal_attendance_status_chk
    CHECK (status IN ('pending','cancelled','collected','no_show')),
  CONSTRAINT meal_attendance_amount_chk CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS meal_attendance_date_status_idx
  ON meal_attendance (date, status);
CREATE INDEX IF NOT EXISTS meal_attendance_client_idx
  ON meal_attendance (client_id, date DESC);

COMMIT;