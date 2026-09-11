// backend/src/middleware/csrf.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import { timingSafeEqual } from "node:crypto";
import { AppError } from "../lib/errors.js";
import { CSRF_COOKIE } from "./auth.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Exempt: no CSRF cookie exists yet at these points, so requiring one would
// make the very first login impossible.
/**
 * No usable CSRF token exists at these points.
 *
 * login/refresh/register : no session cookie has been issued yet.
 * logout                 : the client drops its local state before the request
 *                          lands, so the header is already gone. A forged
 *                          logout only signs the victim out — there is nothing
 *                          to gain — whereas a 403 here leaves the session
 *                          cookie alive and the user stuck signed in.
 */
const EXEMPT_PATHS = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
  "/api/v1/public/account-requests",
]);

// Registration uploads happen before an account exists. They are protected by
// a tight per-IP rate limit and magic-byte validation instead.
const EXEMPT_PREFIXES = ["/api/v1/uploads/avatars", "/api/v1/uploads/documents"];

// Double-submit cookie. cccms_csrf is readable by JS and must be echoed
// in x-csrf-token; the auth cookies stay httpOnly + SameSite=Strict.
export async function csrfGuard(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (SAFE_METHODS.has(req.method)) return;
  const path = req.url.split("?")[0] ?? "";
  if (EXEMPT_PATHS.has(path)) return;

  // Signed-in callers still go through the full check on these paths; only an
  // anonymous applicant is waved through.
  if (!req.cookies?.[CSRF_COOKIE] && EXEMPT_PREFIXES.some((p) => path.startsWith(p))) return;

  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.headers["x-csrf-token"];

  if (!cookie || typeof header !== "string" || header.length !== cookie.length) {
    throw new AppError("CSRF_FAILED", 403);
  }
  if (!timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
    throw new AppError("CSRF_FAILED", 403);
  }
}