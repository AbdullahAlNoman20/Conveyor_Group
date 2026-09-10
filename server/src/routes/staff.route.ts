// backend/src/routes/staff.route.ts
import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { createStaffSchema } from "../schemas/index.js";
import * as staffService from "../services/staff.service.js";
import { resetPasswordFor } from "../services/auth.service.js";
import { audit } from "../middleware/audit.js";
import { notFound } from "../lib/errors.js";
import { deriveEmail } from "../lib/ids.js";

// Only Managers exist as staff. The old "kitchen-staff" route was unreachable
// (no nav link, no seed file, no role gate) and is not carried over.
export default async function staffRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireRole("super_admin"));

  app.get("/managers", async () => ({ success: true, data: await staffService.listManagers() }));

  app.get<{ Params: { id: string } }>("/managers/:id",
    async (req) => ({ success: true, data: await staffService.findManager(req.params.id) }));

  app.post("/managers", async (req) => {
    const body = createStaffSchema.parse(req.body);
    const created = await staffService.createManager(body);
    await audit(req, {
      action: "staff.created", entity: "managers", entityId: created.managerId,
      after: { id: created.managerId, name: created.name },
    });
    return {
      success: true,
      data: {
        id: created.managerId,
        credentials: {
          name: created.name, email: created.email,
          password: created.password, role: "Manager", userId: created.userId,
        },
      },
    };
  });

  app.post<{ Params: { id: string } }>("/managers/:id/toggle", async (req) => {
    const { before, after } = await staffService.toggleManager(req.params.id);
    await audit(req, { action: "staff.toggled", entity: "managers", entityId: req.params.id, before, after });
    return { success: true, data: after };
  });

  app.post<{ Params: { id: string } }>("/managers/:id/reset-password", async (req) => {
    const row = await staffService.findManager(req.params.id);
    if (!row.userId) throw notFound();
    const password = await resetPasswordFor(row.userId);
    await audit(req, { action: "staff.password_reset", entity: "managers", entityId: req.params.id });
    return {
      success: true,
      data: {
        credentials: {
          name: row.name, email: row.email || deriveEmail(row.name),
          password, role: "Manager", userId: row.userId,
        },
      },
    };
  });

  app.delete<{ Params: { id: string } }>("/managers/:id", async (req) => {
    const before = await staffService.deleteManager(req.params.id);
    await audit(req, { action: "staff.deleted", entity: "managers", entityId: req.params.id, before });
    return { success: true, data: { deleted: true } };
  });
}