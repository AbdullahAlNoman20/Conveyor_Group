// backend/src/server.ts
import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { closeDb } from "./db/index.js";
import { closeRedis } from "./lib/redis.js";
import { closeSockets, initSockets } from "./sockets/index.js";
import { closeQueues, scheduleRepeatables } from "./jobs/queue.js";
import { startWorkers, stopWorkers } from "./jobs/workers.js";

let shuttingDown = false;

async function main(): Promise<void> {
  const app = await buildApp();

  initSockets(app);
  startWorkers();
  await scheduleRepeatables();

  await app.listen({ port: env.PORT, host: env.HOST });
  logger.info({ port: env.PORT }, "cccms api listening");

  async function shutdown(signal: string, code = 0): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "graceful shutdown started");

    const timer = setTimeout(() => {
      logger.error("graceful shutdown timed out — forcing exit");
      process.exit(1);
    }, 15_000);
    timer.unref();

    try {
      await app.close();     // drains in-flight requests
      await closeSockets();
      await stopWorkers();
      await closeQueues();
      await closeDb();
      await closeRedis();
      logger.info("graceful shutdown complete");
      process.exit(code);
    } catch (err) {
      logger.error({ err }, "error during shutdown");
      process.exit(1);
    }
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  // Never crash silently — log, then exit cleanly so PM2/Docker restarts.
  process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "unhandled rejection");
    void shutdown("unhandledRejection", 1);
  });
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "uncaught exception");
    void shutdown("uncaughtException", 1);
  });
}

main().catch((err) => {
  logger.fatal({ err }, "failed to start server");
  process.exit(1);
});