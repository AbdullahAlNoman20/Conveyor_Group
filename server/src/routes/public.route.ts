// backend/src/routes/public.route.ts
import type { FastifyInstance } from "fastify";
import { getMenuItem, getWeeklyMenu, listMenu } from "../services/menu.service.js";
import { getPublicSettings } from "../services/settings.service.js";
import { getMealLimitStatus } from "../services/mealLimit.service.js";
import { boardQueue } from "../services/order.service.js";
import { submitRequest } from "../services/accountRequest.service.js";
import { accountRequestSchema } from "../schemas/index.js";
import { audit } from "../middleware/audit.js";

export default async function publicRoutes(app: FastifyInstance) {
  app.get("/menu", async () => ({ success: true, data: await listMenu() }));

  app.get<{ Params: { id: string } }>("/menu/:id",
    async (req) => ({ success: true, data: await getMenuItem(req.params.id) }));

  app.get("/weekly-menu", async () => ({ success: true, data: await getWeeklyMenu() }));
  app.get("/settings", async () => ({ success: true, data: await getPublicSettings() }));
  app.get("/meal-limit", async () => ({ success: true, data: await getMealLimitStatus() }));

  // Token board is a public route in the frontend, so the projection here is
  // deliberately minimal: names + photos only, no IDs, amounts or departments.
  app.get("/board", async () => ({ success: true, data: await boardQueue() }));

  app.post("/account-requests", {
    config: { rateLimit: { max: 3, timeWindow: "10 minutes" } },
  }, async (req) => {
    const body = accountRequestSchema.parse(req.body);
    const row = await submitRequest(body as never);
    await audit(req, { action: "account_request.submitted", entity: "account_requests", entityId: row.id, after: row });
    return { success: true, data: { id: row.id, status: row.status } };
  });
}