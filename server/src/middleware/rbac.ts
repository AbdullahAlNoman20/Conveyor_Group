// backend/src/middleware/rbac.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import { forbidden, unauthorized } from "../lib/errors.js";
import type { Role } from "../lib/jwt.js";

// Roles come from the signed token only — a frontend role claim is never trusted.
export function requireRole(...allowed: Role[]) {
  return async function guard(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!req.auth) throw unauthorized();
    if (!allowed.includes(req.auth.role)) throw forbidden();
  };
}