// server/src/middleware/rbac.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import { forbidden, unauthorized } from "../lib/errors.js";
import type { Role } from "../lib/jwt.js";
import type { Permission } from "../constants/permissions.js";
import { effectivePermissions } from "../services/permission.service.js";

/**
 * Role check. Still used where a route belongs to exactly one kind of account
 * (a client's own statement, say) rather than to a delegable duty.
 */
export function requireRole(...allowed: Role[]) {
  return async function guard(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!req.auth) throw unauthorized();
    if (!allowed.includes(req.auth.role)) throw forbidden();
  };
}

/**
 * Permission check — the default for anything a Super Admin might delegate.
 *
 * Resolved from the user's role defaults plus their individual overrides, so
 * granting one Manager the purchasing duty takes effect without a new role and
 * without a redeploy.
 */
export function requirePermission(...required: Permission[]) {
  return async function guard(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!req.auth) throw unauthorized();

    const held = await effectivePermissions(req.auth.userId);
    // Any-of, not all-of: a screen that reads two things should open if the
    // user can do either.
    if (!required.some((p) => held.includes(p))) throw forbidden();

    req.permissions = held;
  };
}

export async function can(req: FastifyRequest, permission: Permission): Promise<boolean> {
  if (!req.auth) return false;
  const held = req.permissions ?? (await effectivePermissions(req.auth.userId));
  return held.includes(permission);
}