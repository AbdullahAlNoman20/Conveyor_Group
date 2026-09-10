// backend/src/lib/redis.ts
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

function build(label: string): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 200, 5000), // exponential-ish, capped
  });
  client.on("error", (err) => logger.error({ err, label }, "redis error"));
  client.on("ready", () => logger.info({ label }, "redis ready"));
  return client;
}

export const redis = build("main");
export const redisPub = build("pub");
export const redisSub = build("sub");

export async function closeRedis(): Promise<void> {
  await Promise.allSettled([redis.quit(), redisPub.quit(), redisSub.quit()]);
}

// Cache-aside. Never throws — a cache outage must not break a read.
export async function cached<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch { /* degraded cache */ }
  const value = await loader();
  redis.setex(key, ttl, JSON.stringify(value)).catch(() => undefined);
  return value;
}

export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length) await redis.del(...keys).catch(() => undefined);
}

export const CACHE_KEYS = {
  menuAll: "cache:menu:all",
  menuAvail: "cache:menu:avail",
  weeklyMenu: "cache:weekly-menu",
  settings: "cache:settings",
} as const;