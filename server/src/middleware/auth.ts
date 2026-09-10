// backend/src/middleware/auth.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken, type Role } from "../lib/jwt.js";
import { unauthorized } from "../lib/errors.js";
import { redis } from "../lib/redis.js";

declare module "fastify" {
  interface FastifyRequest {
    auth?: { userId: string; role: Role; sid: string };
  }
}

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

  req.auth = { userId: claims.sub, role: claims.role, sid: claims.sid };
}