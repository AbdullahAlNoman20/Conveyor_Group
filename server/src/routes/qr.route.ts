// backend/src/routes/qr.route.ts
import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { qrScanSchema } from "../schemas/index.js";
import { scan } from "../services/qr.service.js";
import { audit } from "../middleware/audit.js";

export default async function qrRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post("/scan", {
    preHandler: [requireRole("manager", "super_admin")],
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
  }, async (req) => {
    const body = qrScanSchema.parse(req.body);
    const result = await scan(body.payload);
    await audit(req, {
      action: result.ok ? "qr.scan_ok" : "qr.scan_rejected",
      entity: "qr",
      entityId: (result.client?.id as string) ?? null,
      after: { message: result.message },
    });
    return { success: true, data: result };
  });
}