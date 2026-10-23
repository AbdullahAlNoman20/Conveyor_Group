-- server/drizzle/0009_recipe_unit.sql
-- A recipe amount can be written in grams for an item stocked in kilograms,
-- so the unit travels with the line and the shopping list inherits both.

BEGIN;

ALTER TABLE menu_item_ingredients
  ADD COLUMN IF NOT EXISTS default_unit text;

COMMIT;