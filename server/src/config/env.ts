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
  // Comma-separated allow-list so localhost and the deployed frontend can both
  // be permitted during a rollout.
  APP_PUBLIC_URL: z.string().min(1),

  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(20),
  DATABASE_SSL: envBool(false),

  REDIS_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  // Blank on purpose in production: the frontend and API live on different
  // Render subdomains, so a Domain attribute would make the cookie unusable.
  COOKIE_DOMAIN: z.string().default(""),
  COOKIE_SECURE: envBool(false),
  // Cross-site cookies need SameSite=None + Secure. "strict" only works when
  // both apps share one origin.
  COOKIE_SAMESITE: z.enum(["strict", "lax", "none"]).default("strict"),

  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_BUCKET: z.string().default("cccms"),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(2097152),

  // Every business-day boundary (the one-meal-per-day rule, the cancellation
  // cutoff, the nightly sweep) is evaluated in this zone, not UTC. Without it,
  // midnight-to-6am local traffic is booked against the previous day.
  APP_TIMEZONE: z.string().default("Asia/Dhaka"),
  // Local hour after which today's meal can no longer be cancelled.
  MEAL_CANCEL_CUTOFF_HOUR: z.coerce.number().int().min(0).max(23).default(6),
  // The counter is only open between these local hours. Outside the window no
  // order can be placed by anyone — client, station scan or Manager scan.
  MEAL_ORDER_START_HOUR: z.coerce.number().int().min(0).max(23).default(11),
  MEAL_ORDER_END_HOUR: z.coerce.number().int().min(1).max(24).default(18),

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

export const ALLOWED_ORIGINS = env.APP_PUBLIC_URL.split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

if (!ALLOWED_ORIGINS.length) {
  throw new Error("APP_PUBLIC_URL must contain at least one origin.");
}

if (env.MEAL_ORDER_END_HOUR <= env.MEAL_ORDER_START_HOUR) {
  throw new Error("MEAL_ORDER_END_HOUR must be later than MEAL_ORDER_START_HOUR.");
}
if (env.MEAL_CANCEL_CUTOFF_HOUR >= env.MEAL_ORDER_START_HOUR) {
  throw new Error(
    "MEAL_CANCEL_CUTOFF_HOUR must be before MEAL_ORDER_START_HOUR — the kitchen " +
      "needs the final headcount before the counter opens.",
  );
}

if (isProd) {
  if (!env.COOKIE_SECURE) throw new Error("COOKIE_SECURE must be true in production (HTTPS only).");
  // SameSite=None without Secure is rejected outright by every modern browser.
  if (env.COOKIE_SAMESITE === "none" && !env.COOKIE_SECURE) {
    throw new Error("COOKIE_SAMESITE=none requires COOKIE_SECURE=true.");
  }
}