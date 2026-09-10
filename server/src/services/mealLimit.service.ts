// backend/src/services/mealLimit.service.ts
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

export const todayISO = () => new Date().toISOString().slice(0, 10);

export interface MealLimitStatus { date: string; dailyLimit: number; served: number; remaining: number }

export async function getMealLimitStatus(date = todayISO()): Promise<MealLimitStatus> {
  const rows = await db.execute<{ date: string; daily_limit: number; served: number }>(sql`
    INSERT INTO meal_limits (date, daily_limit, served)
    VALUES (${date}, ${env.DEFAULT_DAILY_MEAL_LIMIT}, 0)
    ON CONFLICT (date) DO UPDATE SET date = EXCLUDED.date
    RETURNING date::text, daily_limit, served
  `);
  const row = rows[0]!;
  return {
    date: row.date,
    dailyLimit: row.daily_limit,
    served: row.served,
    remaining: Math.max(0, row.daily_limit - row.served),
  };
}

// Atomic reservation: the conditional UPDATE means two concurrent scans can
// never both take the last slot (the old read-then-write race).
export async function consumeMealSlot(date = todayISO()): Promise<void> {
  await getMealLimitStatus(date);
  const rows = await db.execute<{ daily_limit: number }>(sql`
    UPDATE meal_limits SET served = served + 1, updated_at = now()
    WHERE date = ${date} AND served < daily_limit
    RETURNING daily_limit
  `);
  if (!rows[0]) {
    const cur = await getMealLimitStatus(date);
    throw new AppError("MEAL_LIMIT_REACHED", 409, { dailyLimit: cur.dailyLimit },
      `Today's meal limit (${cur.dailyLimit}) has been reached. Please contact the Manager.`);
  }
}

export async function releaseMealSlot(date = todayISO()): Promise<void> {
  await db.execute(sql`
    UPDATE meal_limits SET served = GREATEST(0, served - 1), updated_at = now() WHERE date = ${date}
  `);
}

export async function setDailyLimit(dailyLimit: number, date = todayISO()): Promise<MealLimitStatus> {
  await db.execute(sql`
    INSERT INTO meal_limits (date, daily_limit) VALUES (${date}, ${dailyLimit})
    ON CONFLICT (date) DO UPDATE SET daily_limit = ${dailyLimit}, updated_at = now()
  `);
  return getMealLimitStatus(date);
}