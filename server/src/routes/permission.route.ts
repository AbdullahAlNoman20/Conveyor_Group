// server/src/routes/permission.route.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { PERMISSIONS, PERMISSION_GROUPS, STAFF_ROLES } from "../constants/permissions.js";
import * as permissionService from "../services/permission.service.js";
import { audit } from "../middleware/audit.js";

export default async function permissionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requirePermission(PERMISSIONS.PERMISSION_MANAGE));

  /** The catalogue the admin screen renders from. */
  app.get("/catalogue", async () => ({
    success: true,
    data: { groups: PERMISSION_GROUPS, roles: STAFF_ROLES },
  }));

  app.get("/staff", async () => ({
    success: true,
    data: await permissionService.listStaffAccounts(),
  }));

  app.get<{ Params: { userId: string } }>("/staff/:userId", async (req) => ({
    success: true,
    data: await permissionService.permissionProfile(req.params.userId),
  }));

  app.post<{ Params: { userId: string } }>("/staff/:userId", async (req) => {
    const body = z.object({
      permission: z.string().max(60),
      // null clears the override so the role default applies again — which is
      // not the same as explicitly revoking it.
      granted: z.boolean().nullable(),
      note: z.string().max(200).optional(),
    }).parse(req.body);

    const profile = await permissionService.setOverride({
      userId: req.params.userId,
      permission: body.permission as never,
      granted: body.granted,
      note: body.note,
      actorId: req.auth!.userId,
    });

    await audit(req, {
      action: "permission.changed",
      entity: "user_permissions",
      entityId: req.params.userId,
      after: { permission: body.permission, granted: body.granted },
    });

    return { success: true, data: profile };
  });

  app.post<{ Params: { userId: string } }>("/staff/:userId/role", async (req) => {
    const { role } = z.object({ role: z.enum(STAFF_ROLES) }).parse(req.body);
    const profile = await permissionService.changeRole(req.params.userId, role, req.auth!.userId);
    await audit(req, {
      action: "permission.role_changed",
      entity: "users",
      entityId: req.params.userId,
      after: { role },
    });
    return { success: true, data: profile };
  });
}