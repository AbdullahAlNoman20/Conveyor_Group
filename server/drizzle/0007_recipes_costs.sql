-- server/drizzle/0007_recipes_costs.sql
-- Recipes, per-line units on shopping lists, and landed cost on purchases.

BEGIN;

-- Which raw items a dish is made from. Quantity is optional: the planner's job
-- is to say WHAT is needed, and the shopping list is where the amount is set.
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id            serial PRIMARY KEY,
  menu_item_id  text NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  item_id       text NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  default_qty   numeric(12,3),
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS menu_item_ingredients_uq
  ON menu_item_ingredients (menu_item_id, item_id);
CREATE INDEX IF NOT EXISTS menu_item_ingredients_menu_idx
  ON menu_item_ingredients (menu_item_id);

-- A line can be written in grams even when the item is stocked in kilograms,
-- so the unit travels with the line and is converted on the way into stock.
ALTER TABLE shopping_list_items
  ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE purchase_items
  ADD COLUMN IF NOT EXISTS unit text;

-- Delivery and any other charge on the voucher. Spread across the lines in
-- proportion to their value, so the real cost of the food is what reaches the
-- store room and the per meal figure.
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS transport_cost numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS other_cost numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS other_cost_label text;
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS goods_cost numeric(12,2) NOT NULL DEFAULT 0;

-- Older rows had no extra charges, so the goods total equals the voucher total.
UPDATE purchases SET goods_cost = total_cost WHERE goods_cost = 0;

ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_extra_chk;
ALTER TABLE purchases
  ADD CONSTRAINT purchases_extra_chk
  CHECK (transport_cost >= 0 AND other_cost >= 0 AND goods_cost >= 0);

COMMIT;