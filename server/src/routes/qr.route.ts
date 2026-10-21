// server/src/routes/qr.route.ts
import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { qrScanSchema } from "../schemas/index.js";
import { manualLookup, scan } from "../services/qr.service.js";
import { audit } from "../middleware/audit.js";

export default async function qrRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requirePermission(PERMISSIONS.ORDER_SCAN));

  app.post("/scan", {
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

  /**
   * Serve an employee whose card can't be scanned — lost, damaged, or the
   * camera isn't working.
   *
   * Audited under its own action so a report can show which meals were issued
   * on a staff member's say-so rather than against a presented card.
   */
  app.post<{ Params: { clientId: string } }>("/lookup/:clientId", {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
  }, async (req) => {
    const result = await manualLookup(req.params.clientId);

    await audit(req, {
      action: result.ok ? "qr.manual_lookup" : "qr.manual_lookup_rejected",
      entity: "qr",
      entityId: req.params.clientId,
      after: { message: result.message },
    });

    return { success: true, data: result };
  });
}