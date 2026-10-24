// server/src/routes/headcount.route.ts
import type { FastifyInstance } from "fastify";
import { getDevOffset } from "../lib/clock.js";
import { mealHeadcount } from "../services/attendance.service.js";

/**
 * Public on purpose: the home page and the counter screen show it without a
 * login. It carries counts only, no names.
 */
export default async function headcountRoutes(app: FastifyInstance) {
  // Lets every browser follow the dev clock. Always 0 unless DEV_TOOLS is on,
  // so in production it only tells the browser to use its own clock.
  app.get("/clock", async (_req, reply) => {
    reply.header("Cache-Control", "no-store");
    return { success: true, data: { offsetMs: getDevOffset() } };
  });
  app.get("/headcount", {
    config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
  }, async () => ({ success: true, data: await mealHeadcount() }));
}