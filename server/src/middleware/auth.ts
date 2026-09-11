// backend/src/middleware/auth.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken, type Role } from "../lib/jwt.js";
import { AppError, unauthorized } from "../lib/errors.js";
import { redis } from "../lib/redis.js";

declare module "fastify" {
  interface FastifyRequest {
    auth?: { userId: string; role: Role; sid: string; mustChangePassword: boolean };
  }
}

// The only endpoints reachable while a password change is outstanding.
const PASSWORD_SETUP_PATHS = new Set([
  "/api/v1/auth/me",
  "/api/v1/auth/logout",
  "/api/v1/auth/password",
  "/api/v1/auth/password/initial",
]);

export const ACCESS_COOKIE = "cccms_at";
export const REFRESH_COOKIE = "cccms_rt";
export const CSRF_COOKIE = "cccms_csrf";

export async function authenticate(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = req.headers.authorization;
  const token = req.cookies?.[ACCESS_COOKIE] ?? (header?.startsWith("Bearer ") ? header.slice(7) : null);
  if (!token) throw unauthorized();

  let claims;
  try {
    claims = await verifyAccessToken(token);
  } catch {
    throw unauthorized("TOKEN_EXPIRED");
  }

  // Logout / suspend kills live access tokens immediately.
  if (await redis.get(`session:revoked:${claims.sid}`)) throw unauthorized("TOKEN_EXPIRED");

  req.auth = {
    userId: claims.sub,
    role: claims.role,
    sid: claims.sid,
    mustChangePassword: claims.pwc === true,
  };

  // A bulk-imported account's temporary password is its own email address, so
  // it is effectively public. Until a real password is set, the session can
  // reach nothing but the screen that sets one.
  if (req.auth.mustChangePassword) {
    const path = req.url.split("?")[0] ?? "";
    if (!PASSWORD_SETUP_PATHS.has(path)) {
      throw new AppError(
        "PASSWORD_CHANGE_REQUIRED",
        403,
        {},
        "Set a new password before using the system.",
      );
    }
  }
}

/** Attaches auth when a valid session exists, but never rejects. */
export async function optionalAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await authenticate(req, reply);
  } catch {
    req.auth = undefined;
  }
}