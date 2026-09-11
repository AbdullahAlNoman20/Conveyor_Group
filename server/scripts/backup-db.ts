// server/scripts/backup-db.ts
import { writeFileSync } from "node:fs";
import postgres from "postgres";

/**
 * Dumps every table to a single JSON file. Written because Render's free
 * Postgres is deleted after 30 days and its Shell has no pg_dump — this runs
 * with nothing but the app's own dependencies, from any machine that can reach
 * the database.
 *
 * Restore with: npm run db:deploy   (recreates schema)
 *               tsx scripts/restore-db.ts <file>
 */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const useSsl = ["true", "1", "yes", "on"].includes(
  (process.env.DATABASE_SSL ?? "").trim().toLowerCase(),
);

const sql = postgres(url, {
  max: 1,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  prepare: false,
});

// Insertion order matters on restore: parents before children (FK constraints).
const TABLES = [
  "users",
  "clients",
  "managers",
  "menu_items",
  "weekly_menu",
  "settings",
  "meal_limits",
  "orders",
  "order_items",
  "account_requests",
  "notifications",
  "notification_reads",
  "storage_objects",
] as const;

async function main(): Promise<void> {
  const dump: Record<string, unknown[]> = {};

  for (const table of TABLES) {
    const rows = await sql.unsafe(`SELECT * FROM ${table}`);
    dump[table] = rows;
    console.log(`  ${table.padEnd(20)} ${rows.length} rows`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = `cccms-backup-${stamp}.json`;

  writeFileSync(
    file,
    JSON.stringify({ takenAt: new Date().toISOString(), tables: TABLES, data: dump }, null, 2),
  );

  console.log(`\nwritten: ${file}`);
}

main()
  .catch((err) => {
    console.error("\nBACKUP FAILED:\n", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  });