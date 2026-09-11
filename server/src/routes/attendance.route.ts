// server/src/routes/attendance.route.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import * as attendance from "../services/attendance.service.js";
import { getOwnClient } from "../services/client.service.js";
import { audit } from "../middleware/audit.js";

const dateQuery = z.object({ date: z.iso.date().optional() });
const historyQuery = z.object({
  clientId: z.string().max(40).optional(),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(0).max(11),
});

export default async function attendanceRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /* ── client ──────────────────────────────────────────────────────────── */
  app.get("/me/today", { preHandler: [requireRole("client")] }, async (req) => {
    const client = await getOwnClient(req.auth!.userId);
    return { success: true, data: await attendance.todayStatusFor(client) };
  });

  app.post("/me/cancel", {
    preHandler: [requireRole("client")],
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  }, async (req) => {
    const client = await getOwnClient(req.auth!.userId);
    const row = await attendance.cancelToday(client);
    await audit(req, {
      action: "meal.cancelled",
      entity: "meal_attendance",
      entityId: `${row.date}:${row.clientId}`,
      after: { status: row.status },
    });
    return { success: true, data: await attendance.todayStatusFor(client) };
  });

  app.get<{ Querystring: { year: string; month: string } }>("/me/history", {
    preHandler: [requireRole("client")],
  }, async (req) => {
    const client = await getOwnClient(req.auth!.userId);
    const q = historyQuery.parse(req.query);
    return { success: true, data: await attendance.historyFor(client.id, q.year, q.month) };
  });

  /* ── staff ───────────────────────────────────────────────────────────── */
  app.get("/daily", { preHandler: [requireRole("manager", "super_admin")] }, async (req) => {
    const { date } = dateQuery.parse(req.query);
    return { success: true, data: await attendance.dailyRegister(date) };
  });

  app.get("/history", { preHandler: [requireRole("manager", "super_admin")] }, async (req) => {
    const q = historyQuery.parse(req.query);
    if (!q.clientId) {
      throw (await import("../lib/errors.js")).badRequest("VALIDATION_ERROR");
    }
    return { success: true, data: await attendance.historyFor(q.clientId, q.year, q.month) };
  });

  /**
   * Manual trigger for the nightly sweep. The cron job already runs it, but a
   * Super Admin needs a way to close the day early or re-run after fixing the
   * weekly menu. It is idempotent, so a second run charges nobody twice.
   */
  app.post("/sweep", { preHandler: [requireRole("super_admin")] }, async (req) => {
    const { date } = dateQuery.parse(req.body ?? {});
    const result = await attendance.sweepNoShows(date);
    await audit(req, { action: "meal.noshow_sweep", entity: "meal_attendance", after: result });
    return { success: true, data: result };
  });
}