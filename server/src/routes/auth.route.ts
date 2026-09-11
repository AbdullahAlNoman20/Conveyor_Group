// backend/src/routes/auth.route.ts
import type { FastifyInstance, FastifyReply } from "fastify";
import { env } from "../config/env.js";
import { changePasswordSchema, initialPasswordSchema, loginSchema } from "../schemas/index.js";
import * as authService from "../services/auth.service.js";
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE, authenticate } from "../middleware/auth.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { unauthorized } from "../lib/errors.js";
import { audit } from "../middleware/audit.js";

function setSessionCookies(reply: FastifyReply, s: authService.SessionBundle): void {
  // `domain` is omitted entirely when blank — setting it to "" makes the
  // cookie unusable, and cross-subdomain deploys must not pin a domain.
  const base = {
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
  };
  reply.setCookie(ACCESS_COOKIE, s.accessToken, { ...base, httpOnly: true, maxAge: 15 * 60 });
  reply.setCookie(REFRESH_COOKIE, s.refreshToken, {
    ...base, httpOnly: true, path: "/api/v1/auth", maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400,
  });
  // Readable by JS on purpose — the double-submit CSRF token.
  reply.setCookie(CSRF_COOKIE, s.csrfToken, {
    ...base, httpOnly: false, maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400,
  });
}

/**
 * A cookie is only removed when EVERY attribute matches the one that set it —
 * domain, path, secure and sameSite included. Clearing with just a path left
 * the session cookie alive on cross-site deploys, so /auth/me kept returning
 * 200 and the user was silently signed back in.
 */
function clearSessionCookies(reply: FastifyReply): void {
  const base = {
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
  };

  reply.clearCookie(ACCESS_COOKIE, { ...base, httpOnly: true });
  reply.clearCookie(REFRESH_COOKIE, { ...base, httpOnly: true, path: "/api/v1/auth" });
  reply.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false });
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

  /**
   * Deliberately NOT behind `authenticate`: an expired or already-revoked
   * token would make logout fail with a 401, leaving the cookies in place —
   * exactly the state the user is trying to get out of. Cookies are always
   * cleared; the session row is revoked when a token is still readable.
   */
  app.post("/logout", async (req, reply) => {
    const token = req.cookies?.[ACCESS_COOKIE];
    if (token) {
      try {
        const claims = await verifyAccessToken(token);
        await authService.revokeSession(claims.sid);
        await audit(req, { action: "auth.logout", entity: "users", entityId: claims.sub });
      } catch {
        // Token unreadable — nothing to revoke, but still clear the cookies.
      }
    }

    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (refreshToken) await authService.revokeByRefreshToken(refreshToken).catch(() => undefined);

    clearSessionCookies(reply);
    return { success: true, data: { loggedOut: true } };
  });

  app.get("/me", { preHandler: [authenticate] },
    async (req) => ({ success: true, data: await authService.publicUser(req.auth!.userId) }));

  /**
   * First-login password set for bulk-imported accounts. Reachable while the
   * session is otherwise locked down, and deliberately does not ask for the
   * current password — it is the user's own email address.
   */
  app.post("/password/initial", {
    preHandler: [authenticate],
    config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
  }, async (req, reply) => {
    const body = initialPasswordSchema.parse(req.body);
    await authService.setInitialPassword(req.auth!.userId, body.newPassword);
    clearSessionCookies(reply);
    await audit(req, { action: "auth.initial_password_set", entity: "users", entityId: req.auth!.userId });
    return { success: true, data: { changed: true } };
  });

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