// server/scripts/reset-data.ts
/**
 * Wipes all activity data and keeps the accounts, so testing can start from 0.
 *
 * KEPT     : users, clients (employees), permissions, settings, menu, recipes,
 *            weekly menu, inventory item names (stock and cost set to 0).
 * CLEARED  : every other table (orders, attendance, bills, purchases, shopping
 *            lists, consumption, stock movements, notifications, audit, etc).
 *
 * No CASCADE on purpose: if a kept table points at a cleared one, Postgres
 * stops with an error instead of silently wiping the kept table.
 *
 * Usage:
 *   npx tsx --env-file=.env.render scripts/reset-data.ts            (dry run)
 *   npx tsx --env-file=.env.render scripts/reset-data.ts --yes      (real)
 */
import { sql } from "drizzle-orm";
import { db } from "../src/db/index.js";

const KEEP = new Set([
  "users",
  "clients",
  "user_permissions",
  "settings",
  "menu_items",
  "menu_item_ingredients",
  "weekly_menu",
  "inventory_items",
]);

const isMigrationTable = (t: string) => /migration/i.test(t);
const quote = (t: string) => `"${t.replace(/"/g, '""')}"`;

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await db.execute<{ ok: number }>(sql`
    SELECT 1 AS ok FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
  `);
  return rows.length > 0;
}

async function main() {
  const confirmed = process.argv.includes("--yes");

  const url = process.env.DATABASE_URL ?? "";
  const host = url.replace(/^.*@/, "").replace(/\/.*$/, "") || "(unknown host)";
  console.log(`Database: ${host}`);

  const tables = await db.execute<{ table_name: string }>(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const toClear = tables
    .map((t) => t.table_name)
    .filter((t) => !KEEP.has(t) && !isMigrationTable(t));

  const kept = tables.map((t) => t.table_name).filter((t) => !toClear.includes(t));

  console.log(`\nKeep  (${kept.length}): ${kept.join(", ")}`);
  console.log(`Clear (${toClear.length}): ${toClear.join(", ")}`);

  if (!confirmed) {
    console.log("\nDry run only. Add --yes to really clear the data.");
    return;
  }

  await db.transaction(async (tx) => {
    if (toClear.length) {
      // One statement, so tables that point at each other are cleared together.
      await tx.execute(
        sql.raw(`TRUNCATE TABLE ${toClear.map(quote).join(", ")} RESTART IDENTITY`),
      );
    }

    // Running balances start from 0 again.
    if (await columnExists("clients", "monthly_bill")) {
      await tx.execute(sql`UPDATE clients SET monthly_bill = 0`);
    }

    // Item names stay, stock and average cost go back to 0.
    if (await columnExists("inventory_items", "current_qty")) {
      await tx.execute(sql`UPDATE inventory_items SET current_qty = 0`);
    }
    if (await columnExists("inventory_items", "avg_unit_cost")) {
      await tx.execute(sql`UPDATE inventory_items SET avg_unit_cost = 0`);
    }
  });

  // Dashboard view reads from the cleared tables.
  const mv = await db.execute<{ matviewname: string }>(sql`
    SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'
  `);
  for (const v of mv) {
    await db.execute(sql.raw(`REFRESH MATERIALIZED VIEW ${quote(v.matviewname)}`));
  }

  const [counts] = await db.execute<{ users: number; clients: number }>(sql`
    SELECT (SELECT count(*)::int FROM users) AS users,
           (SELECT count(*)::int FROM clients) AS clients
  `);

  console.log(`\nDone. Accounts kept: ${counts!.users} users, ${counts!.clients} employees.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    let e: unknown = err;
    while (e) {
      console.error(e instanceof Error ? e.message : e);
      e = (e as { cause?: unknown })?.cause;
    }
    process.exit(1);
  });