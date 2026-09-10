// backend/src/services/settings.service.ts
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { settings } from "../db/schema.js";
import { CACHE_KEYS, cached, invalidate } from "../lib/redis.js";
import { env } from "../config/env.js";
import { notFound } from "../lib/errors.js";

export type Settings = typeof settings.$inferSelect;

export async function getSettings(): Promise<Settings> {
  return cached(CACHE_KEYS.settings, 300, async () => {
    const row = await db.query.settings.findFirst({ where: eq(settings.id, 1) });
    if (row) return row;
    const [created] = await db.insert(settings)
      .values({ id: 1, selfOrderStationCode: env.SELF_ORDER_STATION_CODE }).returning();
    return created!;
  });
}

// Public projection — nothing internal leaks to unauthenticated callers.
export async function getPublicSettings() {
  const s = await getSettings();
  return {
    restaurantName: s.restaurantName,
    displayNameOnBoard: s.displayNameOnBoard,
    selfOrderStationCode: s.selfOrderStationCode,
  };
}

export async function patchSettings(patch: Partial<typeof settings.$inferInsert>) {
  const [row] = await db.update(settings)
    .set({ ...patch, updatedAt: new Date() }).where(eq(settings.id, 1)).returning();
  if (!row) throw notFound();
  await invalidate(CACHE_KEYS.settings);
  return row;
}