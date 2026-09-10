// backend/src/routes/settings.route.ts
import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { mealLimitPatchSchema, settingsPatchSchema } from "../schemas/index.js";
import { getSettings, patchSettings } from "../services/settings.service.js";
import { getMealLimitStatus, setDailyLimit } from "../services/mealLimit.service.js";
import { emitCollectionChanged } from "../sockets/index.js";
import { audit } from "../middleware/audit.js";

export default async function settingsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/", { preHandler: [requireRole("super_admin", "manager")] },
    async () => ({ success: true, data: await getSettings() }));

  app.patch("/", { preHandler: [requireRole("super_admin")] }, async (req) => {
    const body = settingsPatchSchema.parse(req.body);
    const before = await getSettings();
    const after = await patchSettings(body);
    await audit(req, { action: "settings.updated", entity: "settings", entityId: "1", before, after });
    emitCollectionChanged("settings", ["super_admin", "manager", "client"]);
    return { success: true, data: after };
  });

  app.get("/meal-limit", { preHandler: [requireRole("super_admin", "manager")] },
    async () => ({ success: true, data: await getMealLimitStatus() }));

  app.patch("/meal-limit", { preHandler: [requireRole("super_admin")] }, async (req) => {
    const body = mealLimitPatchSchema.parse(req.body);
    const before = await getMealLimitStatus();
    const after = await setDailyLimit(body.dailyLimit);
    await audit(req, { action: "meal_limit.updated", entity: "meal_limits", entityId: after.date, before, after });
    emitCollectionChanged("mealLimit", ["super_admin", "manager", "client"]);
    return { success: true, data: after };
  });
}