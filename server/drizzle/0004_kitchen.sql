-- server/drizzle/0004_kitchen.sql
-- Kitchen procurement, inventory and cost-per-meal.
--
-- Stock is valued at a moving average: a purchase blends its unit cost into
-- the running average, and consumption is charged out at that average. This is
-- what makes "4 kg of rice was used today" convertible into taka, and so what
-- makes cost-per-meal meaningful at all.

BEGIN;

CREATE TABLE IF NOT EXISTS inventory_items (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  unit          text NOT NULL DEFAULT 'kg',
  current_qty   numeric(12,3) NOT NULL DEFAULT 0,
  avg_unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  low_stock_qty numeric(12,3) NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_items_unit_chk
    CHECK (unit IN ('kg','g','litre','ml','piece','dozen','packet','bundle')),
  CONSTRAINT inventory_items_qty_chk  CHECK (current_qty >= 0),
  CONSTRAINT inventory_items_cost_chk CHECK (avg_unit_cost >= 0)
);
-- Typing "Other" adds to the catalogue, so the same item can't be entered
-- twice under different casing.
CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_name_uq
  ON inventory_items (lower(name));

CREATE TABLE IF NOT EXISTS shopping_lists (
  id          text PRIMARY KEY,
  for_date    date NOT NULL,
  status      text NOT NULL DEFAULT 'draft',
  notes       text,
  created_by  text REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shopping_lists_status_chk CHECK (status IN ('draft','purchased'))
);
CREATE INDEX IF NOT EXISTS shopping_lists_date_idx ON shopping_lists (for_date DESC);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id       serial PRIMARY KEY,
  list_id  text NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  item_id  text NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  qty      numeric(12,3) NOT NULL,
  note     text,
  CONSTRAINT shopping_list_items_qty_chk CHECK (qty > 0)
);
CREATE INDEX IF NOT EXISTS shopping_list_items_list_idx ON shopping_list_items (list_id);

CREATE TABLE IF NOT EXISTS purchases (
  id            text PRIMARY KEY,
  list_id       text REFERENCES shopping_lists(id) ON DELETE SET NULL,
  purchase_date date NOT NULL,
  voucher_path  text,
  total_cost    numeric(12,2) NOT NULL DEFAULT 0,
  notes         text,
  created_by    text REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchases_total_chk CHECK (total_cost >= 0)
);
CREATE INDEX IF NOT EXISTS purchases_date_idx ON purchases (purchase_date DESC);

CREATE TABLE IF NOT EXISTS purchase_items (
  id          serial PRIMARY KEY,
  purchase_id text NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  item_id     text NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  qty         numeric(12,3) NOT NULL,
  line_cost   numeric(12,2) NOT NULL,
  CONSTRAINT purchase_items_qty_chk  CHECK (qty > 0),
  CONSTRAINT purchase_items_cost_chk CHECK (line_cost >= 0)
);
CREATE INDEX IF NOT EXISTS purchase_items_purchase_idx ON purchase_items (purchase_id);

CREATE TABLE IF NOT EXISTS consumptions (
  id         text PRIMARY KEY,
  used_date  date NOT NULL,
  item_id    text NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  qty        numeric(12,3) NOT NULL,
  unit_cost  numeric(12,2) NOT NULL,
  cost       numeric(12,2) NOT NULL,
  note       text,
  created_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consumptions_qty_chk CHECK (qty > 0)
);
CREATE INDEX IF NOT EXISTS consumptions_date_idx ON consumptions (used_date DESC);
CREATE INDEX IF NOT EXISTS consumptions_item_idx ON consumptions (item_id, used_date DESC);

-- Append-only audit trail: every change to current_qty has a row here, so a
-- stock figure can always be explained.
CREATE TABLE IF NOT EXISTS inventory_movements (
  id          text PRIMARY KEY,
  item_id     text NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  moved_date  date NOT NULL,
  kind        text NOT NULL,
  qty_delta   numeric(12,3) NOT NULL,
  unit_cost   numeric(12,2) NOT NULL DEFAULT 0,
  balance_qty numeric(12,3) NOT NULL,
  ref_id      text,
  note        text,
  created_by  text REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_movements_kind_chk
    CHECK (kind IN ('purchase','consumption','adjustment','opening'))
);
CREATE INDEX IF NOT EXISTS inventory_movements_item_idx
  ON inventory_movements (item_id, created_at DESC);

COMMIT;