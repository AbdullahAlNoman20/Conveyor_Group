// backend/src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import * as schema from "./schema.js";

export const sqlClient = postgres(env.DATABASE_URL, {
  max: env.DATABASE_POOL_MAX,
  ssl: env.DATABASE_SSL ? "require" : false,
  idle_timeout: 30,
  connect_timeout: 10,
  prepare: false, // required for PgBouncer transaction mode
  onnotice: () => undefined,
});

export const db = drizzle(sqlClient, { schema });
export { schema };

export async function pingDb(): Promise<boolean> {
  try { await sqlClient`SELECT 1`; return true; }
  catch (err) { logger.error({ err }, "db ping failed"); return false; }
}

export async function closeDb(): Promise<void> {
  await sqlClient.end({ timeout: 5 });
}