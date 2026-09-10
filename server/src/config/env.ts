// backend/src/config/env.ts
import "dotenv/config"; // belt-and-braces: works even if --env-file isn't passed
import { z } from "zod";

/**
 * .env values are always strings, and Boolean("false") === true, so
 * z.coerce.boolean() silently turns every flag on. This parses the actual
 * word instead.
 */
const envBool = (defaultValue: boolean) =>
  z
    .union([z.boolean(), z.string()])
    .default(defaultValue)
    .transform((v) => {
      if (typeof v === "boolean") return v;
      return ["true", "1", "yes", "on"].includes(v.trim().toLowerCase());
    });

// zod v4: the string-method forms (.email(), .url()) are now top-level helpers.
const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  APP_PUBLIC_URL: z.url(),

  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(20),
  DATABASE_SSL: envBool(false),

  REDIS_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_DOMAIN: z.string().default("localhost"),
  COOKIE_SECURE: envBool(false),

  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_BUCKET: z.string().default("cccms"),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(2097152),

  DEFAULT_DAILY_MEAL_LIMIT: z.coerce.number().int().positive().default(300),
  SELF_ORDER_STATION_CODE: z.string().min(6).default("CONVEYOR-SELF-ORDER-STATION-01"),
  SEED_ADMIN_EMAIL: z.email().default("superadmin@conveyorgroup.com"),
  SEED_DEFAULT_PASSWORD: z.string().min(8).default("Demo@123"),

  ENABLE_SWAGGER: envBool(false),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

if (isProd && !env.COOKIE_SECURE) {
  throw new Error("COOKIE_SECURE must be true in production (HTTPS only).");
}