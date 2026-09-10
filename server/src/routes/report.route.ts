// backend/src/routes/report.route.ts
import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { reportRangeQuery, statementQuery } from "../schemas/index.js";
import * as reports from "../services/report.service.js";
import { getMealLimitStatus } from "../services/mealLimit.service.js";
import { orderRepo } from "../repositories/order.repo.js";
import { hydrateOrders, todaysFixedMeal } from "../services/order.service.js";
import { getOwnClient } from "../services/client.service.js";
import { badRequest } from "../lib/errors.js";

export default async function reportRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/who-ate", { preHandler: [requireRole("manager", "super_admin")] }, async (req) => {
    const q = reportRangeQuery.parse(req.query);
    return { success: true, data: await reports.whoAte(reports.resolveRange(q.preset, q.from, q.to)) };
  });

  app.get("/statement", { preHandler: [requireRole("manager", "super_admin")] }, async (req) => {
    const q = statementQuery.parse(req.query);
    if (!q.clientId) throw badRequest("VALIDATION_ERROR");
    return { success: true, data: await reports.statement(q.clientId, q.year, q.month) };
  });

  // One call powers every dashboard; the payload differs by role.
  app.get("/dashboard", async (req) => {
    if (req.auth!.role === "client") {
      const me = await getOwnClient(req.auth!.userId);
      const { rows } = await orderRepo.list({ clientId: me.id, page: 1, pageSize: 4 });
      const fixedMeal = await todaysFixedMeal().catch(() => null);
      return {
        success: true,
        data: {
          spend: await reports.clientSpend(me.id),
          qrStatus: me.qrStatus,
          mealPlan: me.mealPlan,
          todaysFixedMeal: fixedMeal,
          recentOrders: await hydrateOrders(rows),
        },
      };
    }

    const [totals, last7, mealLimit] = await Promise.all([
      reports.dashboardTotals(), reports.dinersLast7Days(), getMealLimitStatus(),
    ]);
    const { rows } = await orderRepo.list({
      from: new Date().toISOString().slice(0, 10), page: 1, pageSize: 10,
    });
    return { success: true, data: { totals, last7, mealLimit, todaysOrders: await hydrateOrders(rows) } };
  });
}