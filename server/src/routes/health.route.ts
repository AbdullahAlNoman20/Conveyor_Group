// backend/src/routes/health.route.ts
import type { FastifyInstance } from "fastify";
import { pingDb } from "../db/index.js";
import { redis } from "../lib/redis.js";

export default async function healthRoutes(app: FastifyInstance) {
  app.get("/health", { config: { rateLimit: false } },
    async () => ({ status: "ok", uptime: process.uptime() }));

  app.get("/ready", { config: { rateLimit: false } }, async (_req, reply) => {
    const [dbOk, redisOk] = await Promise.all([
      pingDb(),
      redis.ping().then(() => true).catch(() => false),
    ]);
    const ready = dbOk && redisOk;
    return reply.code(ready ? 200 : 503).send({ ready, db: dbOk, redis: redisOk });
  });
}