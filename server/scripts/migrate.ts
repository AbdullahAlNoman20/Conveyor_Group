// server/scripts/migrate.ts
import "dotenv/config"; // so `npm run db:deploy` works without --env-file locally
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

/**
 * Applies drizzle/0000_init.sql. Environment-agnostic on purpose: it reads
 * DATABASE_SSL like the app does, so the exact same command works against a
 * managed provider (TLS, self-signed chain) and a VPS Postgres on localhost.
 *
 * The SQL itself is idempotent (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF
 * NOT EXISTS), so re-running on an existing database is a no-op rather than
 * an error.
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
  // Managed providers terminate TLS with their own CA, so the chain can't be
  // verified locally. On a VPS with DATABASE_SSL=false this is skipped entirely.
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  connect_timeout: 20,
  prepare: false,
});

async function main(): Promise<void> {
  const dir = resolve(process.cwd(), "drizzle");

  // Every .sql file, in filename order. Each one is written to be idempotent
  // (IF NOT EXISTS / DROP ... IF EXISTS), so re-running the whole folder on an
  // existing database is a no-op rather than an error.
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (!files.length) {
    console.log("no migration files found in drizzle/");
    return;
  }

  console.log(`ssl: ${useSsl ? "on (relaxed verification)" : "off"}`);

  for (const name of files) {
    const ddl = readFileSync(resolve(dir, name), "utf8");
    console.log(`applying ${name}`);
    await sql.unsafe(ddl);
  }

  console.log(`\n${files.length} migration(s) applied`);
}

main()
  .catch((err) => {
    console.error("\nMIGRATION FAILED:\n", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  });