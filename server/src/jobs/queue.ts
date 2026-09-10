// backend/src/jobs/queue.ts
import { Queue } from "bullmq";
import { redis } from "../lib/redis.js";

const connection = redis;
const defaultJobOptions = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: { age: 3600, count: 500 },
  removeOnFail: { age: 86_400 },
};

export const QUEUES = {
  storageCleanup: "storage-cleanup",
  dashboardRefresh: "dashboard-refresh",
  dailyMealRollover: "daily-meal-rollover",
  welcomeEmail: "welcome-email",
} as const;

export const storageCleanupQueue = new Queue(QUEUES.storageCleanup, { connection, defaultJobOptions });
export const dashboardRefreshQueue = new Queue(QUEUES.dashboardRefresh, { connection, defaultJobOptions });
export const dailyMealRolloverQueue = new Queue(QUEUES.dailyMealRollover, { connection, defaultJobOptions });
export const welcomeEmailQueue = new Queue(QUEUES.welcomeEmail, { connection, defaultJobOptions });

// BullMQ v6 replaced `add(..., { repeat })` with Job Schedulers. upsert is
// idempotent, so re-running this on every boot never stacks duplicate crons.
export async function scheduleRepeatables(): Promise<void> {
  await storageCleanupQueue.upsertJobScheduler(
    "storage-sweep", { pattern: "0 3 * * *" }, { name: "sweep" },
  );
  await dashboardRefreshQueue.upsertJobScheduler(
    "dash-refresh", { pattern: "*/5 * * * *" }, { name: "refresh" },
  );
  await dailyMealRolloverQueue.upsertJobScheduler(
    "meal-rollover", { pattern: "1 0 * * *" }, { name: "rollover" },
  );
}

export async function closeQueues(): Promise<void> {
  await Promise.allSettled([
    storageCleanupQueue.close(), dashboardRefreshQueue.close(),
    dailyMealRolloverQueue.close(), welcomeEmailQueue.close(),
  ]);
}