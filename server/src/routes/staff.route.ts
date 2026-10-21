// server/src/routes/staff.route.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { createStaffSchema } from "../schemas/index.js";
import * as staffService from "../services/staff.service.js";
import { resetPasswordFor } from "../services/auth.service.js";
import { audit } from "../middleware/audit.js";
import { deriveEmail } from "../lib/ids.js";

/**
 * Staff are Manager and Accounts logins. The paths keep the `/managers`
 * segment so existing clients keep working, but the list is now the real set
 * of staff accounts rather than rows in the legacy `managers` table.
 */
export default async function staffRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requirePermission(PERMISSIONS.STAFF_MANAGE));

  app.get("/managers", async () => ({ success: true, data: await staffService.listStaff() }));

  app.get<{ Params: { id: string } }>("/managers/:id", async (req) => {
    const row = await staffService.findStaff(req.params.id);
    return {
      success: true,
      data: { id: row.id, name: row.name, email: row.email, role: row.role, status: row.status },
    };
  });

  app.post("/managers", async (req) => {
    const body = createStaffSchema.parse(req.body);
    const created = await staffService.createStaff(body);

    await audit(req, {
      action: "staff.created",
      entity: "users",
      entityId: created.userId,
      after: { name: created.name, role: created.role },
    });

    return {
      success: true,
      data: {
        id: created.userId,
        credentials: {
          name: created.name,
          email: created.email,
          password: created.password,
          role: created.roleLabel,
          userId: created.userId,
        },
      },
    };
  });

  app.post<{ Params: { id: string } }>("/managers/:id/toggle", async (req) => {
    const { before, after } = await staffService.toggleStaff(req.params.id);
    await audit(req, { action: "staff.toggled", entity: "users", entityId: req.params.id, before, after });
    return { success: true, data: after };
  });

  app.post<{ Params: { id: string } }>("/managers/:id/role", async (req) => {
    const { role } = z.object({ role: z.enum(["manager", "accounts"]) }).parse(req.body);
    const { before, after } = await staffService.changeStaffRole(req.params.id, role, req.auth!.userId);
    await audit(req, { action: "staff.role_changed", entity: "users", entityId: req.params.id, before, after });
    return { success: true, data: after };
  });

  app.post<{ Params: { id: string } }>("/managers/:id/reset-password", async (req) => {
    const row = await staffService.findStaff(req.params.id);
    const password = await resetPasswordFor(row.id);

    await audit(req, { action: "staff.password_reset", entity: "users", entityId: req.params.id });

    return {
      success: true,
      data: {
        credentials: {
          name: row.name,
          email: row.email || deriveEmail(row.name),
          password,
          role: row.role === "accounts" ? "Accounts" : "Manager",
          userId: row.id,
        },
      },
    };
  });

  app.delete<{ Params: { id: string } }>("/managers/:id", async (req) => {
    const before = await staffService.deleteStaff(req.params.id, req.auth!.userId);
    await audit(req, { action: "staff.deleted", entity: "users", entityId: req.params.id, before });
    return { success: true, data: { deleted: true } };
  });
}