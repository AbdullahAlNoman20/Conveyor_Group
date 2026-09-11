// backend/src/jobs/workers.ts
import { Worker } from "bullmq";
import { and, eq, isNotNull, lt } from "drizzle-orm";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { db } from "../db/index.js";
import { storageObjects } from "../db/schema.js";
import { hardDelete } from "../storage/supabase.js";
import { refreshDashboardViews } from "../services/report.service.js";
import { getMealLimitStatus } from "../services/mealLimit.service.js";
import { sweepNoShows } from "../services/attendance.service.js";
import { QUEUES } from "./queue.js";

const connection = redis;
const workers: Worker[] = [];

export function startWorkers(): void {
  // Orphan sweep: nothing may be left behind in the Supabase bucket.
  workers.push(new Worker(QUEUES.storageCleanup, async () => {
    const cutoff = new Date(Date.now() - 24 * 3600_000);
    const rows = await db.select().from(storageObjects)
      .where(and(isNotNull(storageObjects.orphanedAt), lt(storageObjects.orphanedAt, cutoff)))
      .limit(500);
    if (!rows.length) return;
    await hardDelete(rows.map((r) => r.path));
    for (const r of rows) await db.delete(storageObjects).where(eq(storageObjects.path, r.path));
    logger.info({ removed: rows.length }, "orphaned storage objects purged");
  }, { connection, concurrency: 1 }));

  workers.push(new Worker(QUEUES.dashboardRefresh, async () => {
    await refreshDashboardViews();
  }, { connection, concurrency: 1 }));

  workers.push(new Worker(QUEUES.dailyMealRollover, async () => {
    // Materialises today's meal_limits row so the first scan of the day is fast.
    logger.info({ status: await getMealLimitStatus() }, "daily meal limit rolled over");
  }, { connection, concurrency: 1 }));

  // Charges everyone who neither cancelled nor collected today's meal.
  workers.push(new Worker(QUEUES.noShowSweep, async () => {
    const result = await sweepNoShows();
    logger.info({ result }, "no-show sweep finished");
  }, { connection, concurrency: 1 }));

  // No SMTP is wired yet — the job exists so adding a provider later needs
  // no route changes.
  workers.push(new Worker(QUEUES.welcomeEmail, async (job) => {
    logger.info({ to: job.data?.email }, "welcome email queued (no SMTP configured)");
  }, { connection, concurrency: 5 }));

  for (const w of workers) w.on("failed", (job, err) => logger.error({ err, jobId: job?.id }, "job failed"));
}

export async function stopWorkers(): Promise<void> {
  await Promise.allSettled(workers.map((w) => w.close()));
  workers.length = 0;
}