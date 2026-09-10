// backend/src/routes/auth.route.ts
import type { FastifyInstance, FastifyReply } from "fastify";
import { env } from "../config/env.js";
import { changePasswordSchema, loginSchema } from "../schemas/index.js";
import * as authService from "../services/auth.service.js";
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE, authenticate } from "../middleware/auth.js";
import { unauthorized } from "../lib/errors.js";
import { audit } from "../middleware/audit.js";

function setSessionCookies(reply: FastifyReply, s: authService.SessionBundle): void {
  const base = { domain: env.COOKIE_DOMAIN, secure: env.COOKIE_SECURE, sameSite: "strict" as const, path: "/" };
  reply.setCookie(ACCESS_COOKIE, s.accessToken, { ...base, httpOnly: true, maxAge: 15 * 60 });
  reply.setCookie(REFRESH_COOKIE, s.refreshToken, {
    ...base, httpOnly: true, path: "/api/v1/auth", maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400,
  });
  // Readable by JS on purpose — the double-submit CSRF token.
  reply.setCookie(CSRF_COOKIE, s.csrfToken, {
    ...base, httpOnly: false, maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400,
  });
}

function clearSessionCookies(reply: FastifyReply): void {
  const base = { domain: env.COOKIE_DOMAIN, path: "/" };
  reply.clearCookie(ACCESS_COOKIE, base);
  reply.clearCookie(REFRESH_COOKIE, { ...base, path: "/api/v1/auth" });
  reply.clearCookie(CSRF_COOKIE, base);
}

export default async function authRoutes(app: FastifyInstance) {
  app.post("/login", { config: { rateLimit: { max: 8, timeWindow: "5 minutes" } } }, async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const session = await authService.login(body.email, body.password, {
      ip: req.ip, ua: req.headers["user-agent"] as string | undefined,
    });
    setSessionCookies(reply, session);
    await audit(req, { action: "auth.login", entity: "users", entityId: session.user.id });
    return { success: true, data: { user: session.user, csrfToken: session.csrfToken } };
  });

  app.post("/refresh", { config: { rateLimit: { max: 30, timeWindow: "5 minutes" } } }, async (req, reply) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw unauthorized("TOKEN_EXPIRED");
    const session = await authService.refresh(token, {
      ip: req.ip, ua: req.headers["user-agent"] as string | undefined,
    });
    setSessionCookies(reply, session);
    return { success: true, data: { user: session.user, csrfToken: session.csrfToken } };
  });

  app.post("/logout", { preHandler: [authenticate] }, async (req, reply) => {
    await authService.revokeSession(req.auth!.sid);
    clearSessionCookies(reply);
    await audit(req, { action: "auth.logout", entity: "users", entityId: req.auth!.userId });
    return { success: true, data: { loggedOut: true } };
  });

  app.get("/me", { preHandler: [authenticate] },
    async (req) => ({ success: true, data: await authService.publicUser(req.auth!.userId) }));

  app.post("/password", {
    preHandler: [authenticate],
    config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
  }, async (req, reply) => {
    const body = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.auth!.userId, body.currentPassword, body.newPassword);
    clearSessionCookies(reply);
    await audit(req, { action: "auth.password_changed", entity: "users", entityId: req.auth!.userId });
    return { success: true, data: { changed: true } };
  });
}