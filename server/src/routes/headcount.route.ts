// server/src/routes/headcount.route.ts
import type { FastifyInstance } from "fastify";
import { mealHeadcount } from "../services/attendance.service.js";

/**
 * Public on purpose: the home page and the counter screen show it without a
 * login. It carries counts only, no names.
 */
export default async function headcountRoutes(app: FastifyInstance) {
  app.get("/headcount", {
    config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
  }, async () => ({ success: true, data: await mealHeadcount() }));
}