// backend/src/routes/menu.route.ts
import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { menuItemPatchSchema, menuItemSchema, weeklyMenuSchema } from "../schemas/index.js";
import * as menuService from "../services/menu.service.js";
import { audit } from "../middleware/audit.js";

export default async function menuRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/", async () => ({ success: true, data: await menuService.listMenu() }));

  app.get("/weekly/plan", async () => ({ success: true, data: await menuService.getWeeklyMenu() }));

  app.put("/weekly/plan", { preHandler: [requireRole("manager", "super_admin")] }, async (req) => {
    const body = weeklyMenuSchema.parse(req.body);
    const before = await menuService.getWeeklyMenu();
    const after = await menuService.saveWeeklyMenu(body.days, req.auth!.userId);
    await audit(req, { action: "weekly_menu.saved", entity: "weekly_menu", before, after });
    return { success: true, data: after };
  });

  app.get<{ Params: { id: string } }>("/:id",
    async (req) => ({ success: true, data: await menuService.getMenuItem(req.params.id) }));

  app.post("/", { preHandler: [requireRole("super_admin")] }, async (req) => {
    const body = menuItemSchema.parse(req.body);
    const row = await menuService.createMenuItem(body);
    await audit(req, { action: "menu.created", entity: "menu_items", entityId: row.id, after: row });
    return { success: true, data: await menuService.getMenuItem(row.id) };
  });

  app.patch<{ Params: { id: string } }>("/:id", { preHandler: [requireRole("super_admin")] }, async (req) => {
    const body = menuItemPatchSchema.parse(req.body);
    const { before, after } = await menuService.patchMenuItem(req.params.id, body);
    await audit(req, { action: "menu.updated", entity: "menu_items", entityId: req.params.id, before, after });
    return { success: true, data: await menuService.getMenuItem(req.params.id) };
  });

  app.delete<{ Params: { id: string } }>("/:id", { preHandler: [requireRole("super_admin")] }, async (req) => {
    const before = await menuService.removeMenuItem(req.params.id);
    await audit(req, { action: "menu.deleted", entity: "menu_items", entityId: req.params.id, before });
    return { success: true, data: { deleted: true } };
  });
}