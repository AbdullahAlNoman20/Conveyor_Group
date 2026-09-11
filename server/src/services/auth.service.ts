// backend/src/services/auth.service.ts
import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { refreshTokens } from "../db/schema.js";
import { userRepo } from "../repositories/user.repo.js";
import { clientRepo } from "../repositories/client.repo.js";
import { hashPassword, needsRehash, verifyPassword } from "../lib/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, type Role } from "../lib/jwt.js";
import { generatePassword, randomToken, uuid } from "../lib/ids.js";
import { AppError, unauthorized } from "../lib/errors.js";
import { redis } from "../lib/redis.js";
import { env } from "../config/env.js";
import { signedUrl } from "../storage/supabase.js";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

export interface SessionBundle {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  user: Awaited<ReturnType<typeof publicUser>>;
}

export async function publicUser(id: string) {
  const u = await userRepo.byId(id);
  if (!u) throw unauthorized();
  const client = u.role === "client" ? await clientRepo.byUserId(u.id) : null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
    department: u.department,
    designation: u.designation,
    employeeId: u.employeeId,
    employmentType: u.employmentType,
    mealPlan: u.mealPlan,
    mealBenefit: u.mealBenefit,
    avatarColor: u.avatarColor,
    photo: await signedUrl(u.photoPath),
    // Drives the forced set-password redirect on the client.
    mustChangePassword: u.mustChangePassword,
    clientId: client?.id ?? null,
  };
}

export async function login(email: string, password: string, meta: { ip: string; ua?: string }): Promise<SessionBundle> {
  const user = await userRepo.byEmail(email);

  // Wording matches what Login.jsx / AuthContext.jsx used to show locally.
  if (!user) {
    await verifyPassword(null, password);
    throw new AppError("INVALID_CREDENTIALS", 401);
  }
  if (user.status !== "active") throw new AppError("ACCOUNT_SUSPENDED", 403);
  if (!(await verifyPassword(user.passwordHash, password))) throw new AppError("INCORRECT_PASSWORD", 401);

  if (needsRehash(user.passwordHash)) {
    await userRepo.patch(user.id, { passwordHash: await hashPassword(password) });
  }
  await userRepo.patch(user.id, { lastLoginAt: new Date() });

  return issueSession(user.id, user.role as Role, meta);
}

export async function issueSession(userId: string, role: Role, meta: { ip: string; ua?: string }): Promise<SessionBundle> {
  const sid = uuid();
  const user = await userRepo.byId(userId);
  const accessToken = await signAccessToken({
    sub: userId,
    role,
    sid,
    pwc: user?.mustChangePassword === true,
  });
  const refreshToken = await signRefreshToken(userId, sid);

  await db.insert(refreshTokens).values({
    id: sid,
    userId,
    tokenHash: sha(refreshToken),
    ip: meta.ip,
    userAgent: meta.ua ?? null,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
  });

  return { accessToken, refreshToken, csrfToken: randomToken(24), user: await publicUser(userId) };
}

// Rotating refresh: the presented token is revoked and a fresh one issued.
export async function refresh(token: string, meta: { ip: string; ua?: string }): Promise<SessionBundle> {
  let claims;
  try {
    claims = await verifyRefreshToken(token);
  } catch {
    throw unauthorized("TOKEN_EXPIRED");
  }

  const row = await db.query.refreshTokens.findFirst({
    where: and(eq(refreshTokens.id, claims.sid), isNull(refreshTokens.revokedAt)),
  });

  if (!row || row.tokenHash !== sha(token) || row.expiresAt < new Date()) {
    // Reuse of a revoked token means theft — kill every session for that user.
    if (row) await revokeAllForUser(row.userId);
    throw unauthorized("TOKEN_EXPIRED");
  }

  await revokeSession(row.id);

  const user = await userRepo.byId(row.userId);
  if (!user || user.status !== "active") throw new AppError("ACCOUNT_SUSPENDED", 403);

  return issueSession(user.id, user.role as Role, meta);
}

/**
 * Revokes whatever session a refresh token belongs to. Used by logout so a
 * stale access token can't leave the refresh token alive — otherwise the next
 * silent refresh would hand the user a brand-new session.
 */
export async function revokeByRefreshToken(token: string): Promise<void> {
  const claims = await verifyRefreshToken(token);
  await revokeSession(claims.sid);
}

export async function revokeSession(sid: string): Promise<void> {
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, sid));
  await redis.setex(`session:revoked:${sid}`, 3600, "1");
}

export async function revokeAllForUser(userId: string): Promise<void> {
  const rows = await db.update(refreshTokens).set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
    .returning({ id: refreshTokens.id });
  await Promise.all(rows.map((r) => redis.setex(`session:revoked:${r.id}`, 3600, "1")));
}

/**
 * First-login password set. Only callable while `mustChangePassword` is true,
 * because the current password is the user's own email address — asking them
 * to re-type it would be theatre, not verification.
 */
export async function setInitialPassword(userId: string, next: string): Promise<void> {
  const user = await userRepo.byId(userId);
  if (!user) throw unauthorized();
  if (!user.mustChangePassword) {
    throw new AppError("VALIDATION_ERROR", 409, {}, "Your password has already been set.");
  }
  // Rejecting the email as the new password stops the temporary credential
  // from simply being re-confirmed.
  if (next.trim().toLowerCase() === user.email.toLowerCase()) {
    throw new AppError(
      "WEAK_PASSWORD",
      422,
      {},
      "Choose a password that isn't your email address.",
    );
  }
  await userRepo.patch(userId, { passwordHash: await hashPassword(next), mustChangePassword: false });
  await revokeAllForUser(userId);
}

export async function changePassword(userId: string, current: string, next: string): Promise<void> {
  const user = await userRepo.byId(userId);
  if (!user) throw unauthorized();
  // Verified SERVER-side only — the old PasswordChangeSection TODO is now closed.
  if (!(await verifyPassword(user.passwordHash, current))) throw new AppError("INCORRECT_PASSWORD", 401);
  await userRepo.patch(userId, { passwordHash: await hashPassword(next), mustChangePassword: false });
  await revokeAllForUser(userId);
}

/**
 * Super-Admin-initiated reset. The new password is random and shown once on
 * the welcome-email screen, so the account is immediately usable — unlike a
 * bulk import, there is no guessable placeholder to lock the session behind.
 */
export async function resetPasswordFor(userId: string): Promise<string> {
  const password = generatePassword();
  await userRepo.patch(userId, {
    passwordHash: await hashPassword(password),
    mustChangePassword: false,
  });
  await revokeAllForUser(userId);
  return password;
}