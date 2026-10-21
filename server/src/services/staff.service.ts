// server/src/services/staff.service.ts
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { clients, managers, users } from "../db/schema.js";
import { userRepo } from "../repositories/user.repo.js";
import { hashPassword } from "../lib/password.js";
import { deriveEmail, generatePassword, genId } from "../lib/ids.js";
import { conflict, notFound } from "../lib/errors.js";
import { escapeHtml, sanitizeEmail, sanitizeText } from "../lib/sanitize.js";
import { revokeAllForUser } from "./auth.service.js";
import { invalidatePermissions } from "./permission.service.js";
import { ROLE_LABELS } from "../constants/permissions.js";
import { emitCollectionChanged } from "../sockets/index.js";
import { AppError } from "../lib/errors.js";

export type StaffRole = "manager" | "accounts";

const STAFF_ROLES: StaffRole[] = ["manager", "accounts"];

/**
 * Staff accounts live in `users`, and nowhere else.
 *
 * There used to be a separate `managers` table mirroring them, left over from
 * the mock-JSON era. Listing from it meant an Accounts user, which only ever
 * had a `users` row, never appeared on the staff screen at all. Anything that
 * can drift out of sync with the login row is read from the login row instead.
 */
export async function listStaff() {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      department: users.department,
      designation: users.designation,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(inArray(users.role, STAFF_ROLES))
    .orderBy(users.role, users.name);

  return rows.map((u) => ({
    id: u.id,
    name: escapeHtml(u.name),
    email: u.email,
    phone: u.phone,
    role: u.role,
    roleLabel: ROLE_LABELS[u.role] ?? u.role,
    // The UI calls a disabled login "inactive"; the column says "disabled".
    status: u.status === "active" ? "active" : "inactive",
    department: escapeHtml(u.department ?? ""),
    designation: escapeHtml(u.designation ?? ""),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  }));
}

export async function findStaff(id: string) {
  const row = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!row) throw notFound();
  if (!STAFF_ROLES.includes(row.role as StaffRole)) {
    throw new AppError("VALIDATION_ERROR", 422, {}, "That account is not a staff account.");
  }
  return row;
}

export async function createStaff(input: {
  name: string;
  email: string;
  phone?: string;
  department?: string;
  designation?: string;
  status: "active" | "inactive";
  role?: StaffRole;
}) {
  const name = sanitizeText(input.name, 100);
  const email = input.email ? sanitizeEmail(input.email) : deriveEmail(name);
  if (await userRepo.emailExists(email)) throw conflict("DUPLICATE_EMAIL");

  const role: StaffRole = input.role === "accounts" ? "accounts" : "manager";
  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  const userId = await userRepo.nextSequentialId();
  const department =
    sanitizeText(input.department, 60) || (role === "accounts" ? "Accounts" : "Restaurant Operations");
  const designation =
    sanitizeText(input.designation, 60) || (role === "accounts" ? "Accounts Officer" : "Restaurant Manager");
  const phone = sanitizeText(input.phone, 20) || null;
  const active = input.status === "active";

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      name,
      email,
      phone,
      passwordHash,
      role,
      status: active ? "active" : "disabled",
      department,
      designation,
      avatarColor: role === "accounts" ? "#0284c7" : "#eb2a2d",
      // The generated password is shown once on the welcome screen, so there
      // is nothing guessable to force a change away from.
      mustChangePassword: false,
    });

    // Staff eat the daily meal too. Giving them an ordinary client row means
    // the QR card, the cancel window, the no-show charge and the kitchen
    // headcount all apply to them with no special handling anywhere.
    await tx.insert(clients).values({
      id: genId("C"),
      userId,
      name,
      // Prefixed so a staff meal account can never collide with an HR id.
      employeeId: `STF-${userId.replace(/[^A-Za-z0-9]/g, "")}`,
      email,
      phone,
      department,
      designation,
      employmentType: "Company Employee",
      mealPlan: "Fixed Company Meal",
      // Staff meals are on the company, so nothing is deducted from them.
      mealBenefit: "Complimentary",
      qrStatus: "active",
      qrToken: genId("QR"),
      status: active ? "active" : "suspended",
    });
  });

  emitCollectionChanged("staff", ["super_admin"]);
  emitCollectionChanged("clients", ["super_admin", "manager", "accounts"]);
  return { userId, email, password, name, role, roleLabel: ROLE_LABELS[role] };
}

export async function toggleStaff(id: string) {
  const row = await findStaff(id);
  const next = row.status === "active" ? "disabled" : "active";

  await db.update(users).set({ status: next, updatedAt: new Date() }).where(eq(users.id, id));

  // Disabling has to cut live sessions too, or the person keeps working until
  // their token expires.
  if (next === "disabled") await revokeAllForUser(id);
  await invalidatePermissions(id);

  // Their meal account follows the login, so a disabled staff member stops
  // being counted in the kitchen headcount as well.
  await db.update(clients)
    .set({ status: next === "active" ? "active" : "suspended", updatedAt: new Date() })
    .where(eq(clients.userId, id));

  // Keep the legacy mirror row in step while it still exists, so an old report
  // reading it doesn't contradict the login.
  await db.update(managers)
    .set({ status: next === "active" ? "active" : "inactive" })
    .where(eq(managers.userId, id))
    .catch(() => undefined);

  emitCollectionChanged("staff", ["super_admin"]);
  return { before: row, after: { ...row, status: next } };
}

export async function deleteStaff(id: string, actorId: string) {
  const row = await findStaff(id);
  if (id === actorId) {
    throw new AppError("VALIDATION_ERROR", 422, {}, "You can't remove your own account.");
  }

  await db.transaction(async (tx) => {
    // Never hard-delete: orders, audit rows and attendance all point here, and
    // losing the name would make that history unreadable.
    await tx.update(users)
      .set({ status: "disabled", updatedAt: new Date() })
      .where(eq(users.id, id));

    // Archived rather than deleted, for the same reason — their past meals
    // still have to add up.
    await tx.update(clients)
      .set({ status: "archived", prevStatus: "active", updatedAt: new Date() })
      .where(eq(clients.userId, id));

    await tx.delete(managers).where(eq(managers.userId, id));
  });

  await revokeAllForUser(id);
  await invalidatePermissions(id);
  emitCollectionChanged("staff", ["super_admin"]);
  emitCollectionChanged("clients", ["super_admin", "manager", "accounts"]);
  return row;
}

export async function changeStaffRole(id: string, role: StaffRole, actorId: string) {
  if (!STAFF_ROLES.includes(role)) {
    throw new AppError("VALIDATION_ERROR", 422, {}, "That is not a staff role.");
  }
  if (id === actorId) {
    throw new AppError("VALIDATION_ERROR", 422, {}, "You can't change your own role.");
  }

  const row = await findStaff(id);
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id));
  await invalidatePermissions(id);
  emitCollectionChanged("staff", ["super_admin"]);
  return { before: row, after: { ...row, role } };
}

export { and, sql };