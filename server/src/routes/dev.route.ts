// server/src/routes/dev.route.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { env } from "../config/env.js";
import * as dev from "../services/dev.service.js";

/**
 * Local development toolkit. Registered only when DEV_TOOLS is on, and env.ts
 * refuses to boot with that flag set in production — so these routes cannot
 * exist on a live deployment.
 */
export default async function devRoutes(app: FastifyInstance) {
  if (!env.DEV_TOOLS) return;

  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireRole("super_admin", "manager", "accounts"));

  app.get("/clock", async () => ({ success: true, data: dev.clockStatus() }));

  app.post("/clock", async (req) => {
    const body = z.object({
      days: z.coerce.number().int().min(-400).max(400).optional(),
      hours: z.coerce.number().int().min(-48).max(48).optional(),
      reset: z.boolean().optional(),
    }).parse(req.body ?? {});
    return { success: true, data: dev.setClock(body) };
  });

  app.post("/clock/advance", async (req) => {
    const { days } = z.object({
      days: z.coerce.number().int().min(-30).max(30).default(1),
    }).parse(req.body ?? {});
    return { success: true, data: dev.advanceDays(days) };
  });

  app.post("/history", async (req) => {
    const { days } = z.object({
      days: z.coerce.number().int().min(1).max(120).default(30),
    }).parse(req.body ?? {});
    return { success: true, data: await dev.generateHistory(days) };
  });

  app.post("/history/clear", async () => ({ success: true, data: await dev.clearGenerated() }));

  app.post("/close-day", async (req) => {
    const { date } = z.object({ date: z.iso.date().optional() }).parse(req.body ?? {});
    return { success: true, data: await dev.closeDay(date) };
  });

  app.post("/reset-today", async () => ({ success: true, data: await dev.resetToday() }));
}