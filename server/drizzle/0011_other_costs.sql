-- server/drizzle/0011_other_costs.sql
-- Several other costs are saved as one readable line, e.g.
-- "Labour: Tk 200, Ice: Tk 50", so the label needs more room.
ALTER TABLE purchases ALTER COLUMN other_cost_label TYPE text;