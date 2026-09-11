// server/scripts/restore-db.ts
import { readFileSync } from "node:fs";
import postgres from "postgres";

/**
 * Restores a backup-db.ts dump into a freshly migrated database.
 * Run `npm run db:deploy` first so the schema exists.
 *
 * Rows are inserted in dependency order and conflicts are skipped, so running
 * this against a partially-populated database is safe.
 */
const file = process.argv[2];
const url = process.env.DATABASE_URL;

if (!file) {
  console.error("Usage: tsx scripts/restore-db.ts <backup-file.json>");
  process.exit(1);
}
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

async function main(): Promise<void> {
  const dump = JSON.parse(readFileSync(file!, "utf8")) as {
    tables: string[];
    data: Record<string, Record<string, unknown>[]>;
  };

  for (const table of dump.tables) {
    const rows = dump.data[table] ?? [];
    if (!rows.length) {
      console.log(`  ${table.padEnd(20)} skipped (empty)`);
      continue;
    }

    // Batched insert; ON CONFLICT DO NOTHING keeps a partial re-run harmless.
    for (const row of rows) {
      const cols = Object.keys(row);
      const colList = cols.map((c) => `"${c}"`).join(", ");
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      await sql.unsafe(
        `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        cols.map((c) => row[c] as never),
      );
    }
    console.log(`  ${table.padEnd(20)} ${rows.length} rows`);
  }

  console.log("\nrestore complete");
}

main()
  .catch((err) => {
    console.error("\nRESTORE FAILED:\n", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  });