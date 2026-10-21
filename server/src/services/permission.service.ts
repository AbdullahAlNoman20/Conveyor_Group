// server/src/services/permission.service.ts
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { userPermissions, users } from "../db/schema.js";
import {
  ALL_PERMISSIONS,
  ROLE_LABELS,
  defaultPermissionsFor,
  type Permission,
} from "../constants/permissions.js";
import { redis } from "../lib/redis.js";
import { notFound } from "../lib/errors.js";
import { escapeHtml, sanitizeText } from "../lib/sanitize.js";
import { AppError } from "../lib/errors.js";

const cacheKey = (userId: string) => `perms:${userId}`;
const CACHE_TTL = 300;

/**
 * Role defaults plus grants, minus revokes.
 *
 * Cached in Redis because this runs on every authenticated request; the cache
 * is cleared the moment an override changes, so a revocation takes effect
 * immediately rather than after a timeout.
 */
export async function effectivePermissions(userId: string): Promise<Permission[]> {
  try {
    const hit = await redis.get(cacheKey(userId));
    if (hit) return JSON.parse(hit) as Permission[];
  } catch {
    /* degraded cache — fall through to the database */
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return [];

  const overrides = await db.select().from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  const set = new Set<string>(defaultPermissionsFor(user.role));
  for (const o of overrides) {
    if (o.granted) set.add(o.permission);
    else set.delete(o.permission);
  }

  const result = [...set] as Permission[];
  redis.setex(cacheKey(userId), CACHE_TTL, JSON.stringify(result)).catch(() => undefined);
  return result;
}

export async function hasPermission(userId: string, permission: Permission): Promise<boolean> {
  return (await effectivePermissions(userId)).includes(permission);
}

export const invalidatePermissions = (userId: string) =>
  redis.del(cacheKey(userId)).catch(() => undefined);

/** Everything the admin screen needs to render one person's access. */
export async function permissionProfile(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw notFound();

  const overrides = await db.select().from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  const defaults = new Set<string>(defaultPermissionsFor(user.role));
  const overrideMap = new Map(overrides.map((o) => [o.permission, o.granted]));

  return {
    userId: user.id,
    name: escapeHtml(user.name),
    email: user.email,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role] ?? user.role,
    permissions: ALL_PERMISSIONS.map((key) => {
      const fromRole = defaults.has(key);
      const override = overrideMap.get(key);
      return {
        key,
        fromRole,
        // null means "no override" — the role default applies.
        override: override === undefined ? null : override,
        effective: override === undefined ? fromRole : override,
      };
    }),
  };
}

/**
 * Sets or clears one override. Passing `null` removes the override entirely,
 * so the person falls back to whatever their role grants — which is different
 * from explicitly revoking it, and matters if their role changes later.
 */
export async function setOverride(input: {
  userId: string;
  permission: Permission;
  granted: boolean | null;
  note?: string;
  actorId: string;
}) {
  const user = await db.query.users.findFirst({ where: eq(users.id, input.userId) });
  if (!user) throw notFound();

  if (user.role === "client") {
    throw new AppError(
      "VALIDATION_ERROR",
      422,
      {},
      "Employees use their own self-service screens; staff permissions don't apply to them.",
    );
  }

  if (!ALL_PERMISSIONS.includes(input.permission)) {
    throw new AppError("VALIDATION_ERROR", 422, {}, "Unknown permission.");
  }

  if (input.granted === null) {
    await db.delete(userPermissions).where(
      and(
        eq(userPermissions.userId, input.userId),
        eq(userPermissions.permission, input.permission),
      ),
    );
  } else {
    await db.insert(userPermissions).values({
      userId: input.userId,
      permission: input.permission,
      granted: input.granted,
      note: sanitizeText(input.note, 200) || null,
      grantedBy: input.actorId,
    }).onConflictDoUpdate({
      target: [userPermissions.userId, userPermissions.permission],
      set: {
        granted: input.granted,
        note: sanitizeText(input.note, 200) || null,
        grantedBy: input.actorId,
        createdAt: new Date(),
      },
    });
  }

  await invalidatePermissions(input.userId);
  return permissionProfile(input.userId);
}

/** Staff directory for the permissions screen. */
export async function listStaffAccounts() {
  const rows = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    status: users.status,
  }).from(users).orderBy(users.role, users.name);

  return rows
    .filter((u) => u.role !== "client")
    .map((u) => ({
      id: u.id,
      name: escapeHtml(u.name),
      email: u.email,
      role: u.role,
      roleLabel: ROLE_LABELS[u.role] ?? u.role,
      status: u.status,
    }));
}

export async function changeRole(userId: string, role: string, actorId: string) {
  if (!["super_admin", "manager", "accounts"].includes(role)) {
    throw new AppError("VALIDATION_ERROR", 422, {}, "That isn't a staff role.");
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw notFound();
  if (user.role === "client") {
    throw new AppError("VALIDATION_ERROR", 422, {}, "An employee account can't become staff here.");
  }
  if (userId === actorId) {
    throw new AppError("VALIDATION_ERROR", 422, {}, "You can't change your own role.");
  }

  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
  await invalidatePermissions(userId);
  return permissionProfile(userId);
}