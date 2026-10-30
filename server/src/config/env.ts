// server/src/config/env.ts
import "dotenv/config"; // works even if --env-file isn't passed
import path from "node:path";
import { z } from "zod";

/**
 * .env values are always strings, and Boolean("false") === true, so
 * z.coerce.boolean() silently turns every flag on. This parses the word.
 */
const envBool = (defaultValue: boolean) =>
  z
    .union([z.boolean(), z.string()])
    .default(defaultValue)
    .transform((v) => {
      if (typeof v === "boolean") return v;
      return ["true", "1", "yes", "on"].includes(v.trim().toLowerCase());
    });

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  // Comma separated allow-list of frontend origins.
  APP_PUBLIC_URL: z.string().min(1),

  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().max(50).default(10),
  DATABASE_SSL: envBool(false),

  REDIS_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  // Frontend and API share one domain on the VPS, so lax is enough and still
  // keeps the session when the station QR link is opened from the camera.
  COOKIE_DOMAIN: z.string().default(""),
  COOKIE_SECURE: envBool(false),
  COOKIE_SAMESITE: z.enum(["strict", "lax", "none"]).default("lax"),

  // Uploaded files live on this server's disk.
  STORAGE_DIR: z.string().min(1).default("./uploads"),
  // Start of every file link, e.g. https://canteen.conveyor.com.bd/api/v1/files
  FILES_BASE_URL: z.string().min(1).default("/api/v1/files"),
  // Signs file links. openssl rand -hex 64
  FILE_URL_SECRET: z.string().min(32),
  // Hard ceiling for any single upload. Each kind has its own lower limit too.
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().max(20 * 1024 * 1024).default(10 * 1024 * 1024),

  // Every business-day boundary is evaluated in this zone, not UTC.
  APP_TIMEZONE: z.string().default("Asia/Dhaka"),
  // Local hour after which today's meal can no longer be cancelled.
  MEAL_CANCEL_CUTOFF_HOUR: z.coerce.number().int().min(0).max(23).default(6),
  // The counter is open only between these local hours.
  MEAL_ORDER_START_HOUR: z.coerce.number().int().min(0).max(23).default(11),
  MEAL_ORDER_END_HOUR: z.coerce.number().int().min(1).max(24).default(18),

  DEFAULT_DAILY_MEAL_LIMIT: z.coerce.number().int().positive().default(300),
  SELF_ORDER_STATION_CODE: z.string().min(6).default("CONVEYOR-SELF-ORDER-STATION-01"),
  SEED_ADMIN_EMAIL: z.email().default("superadmin@conveyorgroup.com"),
  SEED_DEFAULT_PASSWORD: z.string().min(8).default("Demo@123"),

  ENABLE_SWAGGER: envBool(false),

  /**
   * Development toolkit: shiftable clock, sample data, manual day close.
   * Local only. The server refuses to start with it in production.
   */
  DEV_TOOLS: envBool(false),
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
    "MEAL_CANCEL_CUTOFF_HOUR must be before MEAL_ORDER_START_HOUR. The kitchen " +
      "needs the final headcount before the counter opens.",
  );
}

if (isProd) {
  if (env.DEV_TOOLS) {
    throw new Error("DEV_TOOLS must be false in production.");
  }
  if (!env.COOKIE_SECURE) throw new Error("COOKIE_SECURE must be true in production (HTTPS only).");
  if (env.COOKIE_SAMESITE === "none" && !env.COOKIE_SECURE) {
    throw new Error("COOKIE_SAMESITE=none requires COOKIE_SECURE=true.");
  }
  if (!path.isAbsolute(env.STORAGE_DIR)) {
    throw new Error("STORAGE_DIR must be an absolute path in production, e.g. /home/conveyor/uploads.");
  }
  if (!env.FILES_BASE_URL.startsWith("https://")) {
    throw new Error("FILES_BASE_URL must be a full https:// link in production.");
  }
  if (env.SEED_DEFAULT_PASSWORD === "Demo@123") {
    console.warn("SEED_DEFAULT_PASSWORD is still the demo password. Change it before seeding.");
  }
}