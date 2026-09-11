// backend/src/services/client.service.ts
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { clients, users } from "../db/schema.js";
import { clientRepo, type ClientRow } from "../repositories/client.repo.js";
import { userRepo } from "../repositories/user.repo.js";
import { hashPassword } from "../lib/password.js";
import { deriveEmail, generatePassword, genId } from "../lib/ids.js";
import { conflict, notFound } from "../lib/errors.js";
import { escapeHtml, sanitizeEmail, sanitizeText } from "../lib/sanitize.js";
import { markOrphan, signedUrl } from "../storage/supabase.js";
import { revokeAllForUser } from "./auth.service.js";
import { emitCollectionChanged } from "../sockets/index.js";
import type { Pagination } from "../lib/pagination.js";
import { ENUMS } from "../db/schema.js";
import { logger } from "../lib/logger.js";

const FIXED_MEAL_PLAN = "Fixed Company Meal";
const EMPLOYMENT_TYPES: readonly string[] = ENUMS.EMPLOYMENT_TYPES;
const MEAL_BENEFITS: readonly string[] = ENUMS.MEAL_BENEFITS;

export async function toPublicClient(c: ClientRow) {
  return {
    id: c.id,
    userId: c.userId,
    name: escapeHtml(c.name),
    employeeId: c.employeeId,
    email: c.email,
    phone: c.phone,
    department: escapeHtml(c.department ?? ""),
    designation: escapeHtml(c.designation ?? ""),
    employmentType: c.employmentType,
    mealPlan: c.mealPlan,
    mealBenefit: c.mealBenefit,
    monthlyBill: Number(c.monthlyBill),
    qrStatus: c.qrStatus,
    // qrToken is deliberately included: it is printed on the physical card and
    // the client's own QR page needs it. Only the owner / staff ever read it.
    qrToken: c.qrToken,
    qrIssuedAt: c.qrIssuedAt,
    status: c.status,
    prevStatus: c.prevStatus,
    photo: await signedUrl(c.photoPath),
    supportingDocument: await signedUrl(c.supportingDocumentPath),
    supportingDocumentName: c.supportingDocumentName,
  };
}

// Staff-facing list never exposes qrToken.
export async function toStaffClient(c: ClientRow) {
  const { qrToken: _omit, ...rest } = await toPublicClient(c);
  void _omit;
  return rest;
}

export async function listClients(opts: { q?: string; status: string } & Pagination) {
  const { rows, total } = await clientRepo.list(opts);
  return { items: await Promise.all(rows.map(toStaffClient)), total };
}

export async function getClient(id: string) {
  const row = await clientRepo.byId(id);
  if (!row) throw notFound("CLIENT_NOT_FOUND");
  return toStaffClient(row);
}

// Resolved by user_id ONLY. The old `clients[0]` fallback showed one client
// another client's profile, statement and QR card.
export async function getOwnClient(userId: string): Promise<ClientRow> {
  const row = await clientRepo.byUserId(userId);
  if (!row) throw notFound("CLIENT_NOT_LINKED");
  return row;
}

export interface CreatedAccount { client: ClientRow; email: string; password: string; userId: string }

export async function createClientWithLogin(input: {
  name: string; employeeId: string; email?: string; phone?: string;
  department: string; designation?: string; employmentType?: string; mealBenefit?: string;
  photoPath?: string; supportingDocumentPath?: string; supportingDocumentName?: string;
}): Promise<CreatedAccount> {
  const name = sanitizeText(input.name, 100);
  const employeeId = sanitizeText(input.employeeId, 30);
  const email = input.email ? sanitizeEmail(input.email) : deriveEmail(name);

  if (await userRepo.emailExists(email)) throw conflict("DUPLICATE_EMAIL");
  if (await clientRepo.byEmployeeId(employeeId)) throw conflict("DUPLICATE_EMPLOYEE_ID");

  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  const clientId = genId("C");
  const userId = await userRepo.nextSequentialId();
  const mealBenefit = input.mealBenefit ?? "Self Paid";
  const employmentType = input.employmentType ?? "Company Employee";

  const client = await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId, name, email,
      phone: sanitizeText(input.phone, 20) || null,
      passwordHash, role: "client", status: "active",
      department: sanitizeText(input.department, 60),
      designation: sanitizeText(input.designation, 60) || null,
      employeeId, employmentType, mealPlan: FIXED_MEAL_PLAN, mealBenefit,
      avatarColor: "#059669",
      photoPath: input.photoPath ?? null,
      mustChangePassword: true,
    });

    const [row] = await tx.insert(clients).values({
      id: clientId, userId, name, employeeId, email,
      phone: sanitizeText(input.phone, 20) || null,
      department: sanitizeText(input.department, 60),
      designation: sanitizeText(input.designation, 60) || null,
      employmentType, mealPlan: FIXED_MEAL_PLAN, mealBenefit,
      supportingDocumentPath: input.supportingDocumentPath ?? null,
      supportingDocumentName: input.supportingDocumentName ?? null,
      qrStatus: "active",
      qrToken: genId("QR"),      // permanent, printed on the card
      status: "active",
      photoPath: input.photoPath ?? null,
    }).returning();

    return row!;
  });

  emitCollectionChanged("clients", ["super_admin", "manager"]);
  return { client, email, password, userId };
}

export interface BulkImportRow {
  rowNumber: number;
  name: string;
  employeeId: string;
  email: string;
  phone?: string;
  department?: string;
  designation?: string;
  employmentType?: string;
  mealBenefit?: string;
}

export interface BulkImportOutcome {
  rowNumber: number;
  name: string;
  employeeId: string;
  email: string;
  status: "created" | "skipped";
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates many clients from a spreadsheet in one pass.
 *
 * Each row gets its own transaction on purpose: one bad row (a duplicate ID
 * slipped in halfway down the file) must not discard the two hundred good rows
 * above it. Every failure is reported back with its original row number so the
 * Super Admin can fix exactly those lines and re-upload.
 *
 * The temporary password is the employee's own email address, and every
 * account is flagged `mustChangePassword`, so the session can reach nothing
 * but the set-password screen until a real one is chosen.
 */
export async function bulkImportClients(rows: BulkImportRow[]): Promise<{
  created: number;
  skipped: number;
  results: BulkImportOutcome[];
}> {
  const results: BulkImportOutcome[] = [];

  // Duplicates *within the file itself* are caught here — the database can't
  // see them until the first of the pair is already committed.
  const seenEmails = new Set<string>();
  const seenEmployeeIds = new Set<string>();

  for (const raw of rows) {
    const name = sanitizeText(raw.name, 100);
    const employeeId = sanitizeText(raw.employeeId, 30);
    const email = sanitizeEmail(raw.email);
    const department = sanitizeText(raw.department, 60);

    const outcome: BulkImportOutcome = {
      rowNumber: raw.rowNumber,
      name,
      employeeId,
      email,
      status: "skipped",
    };

    const reject = (error: string) => {
      outcome.error = error;
      results.push(outcome);
    };

    if (!name) { reject("Full Name is required."); continue; }
    if (!employeeId) { reject("Employee ID is required."); continue; }
    if (!email) { reject("Email is required."); continue; }
    if (!EMAIL_RE.test(email)) { reject("Email address is not valid."); continue; }
    if (!department) { reject("Department is required."); continue; }

    if (seenEmployeeIds.has(employeeId.toLowerCase())) {
      reject("Duplicate Employee ID within this file."); continue;
    }
    if (seenEmails.has(email)) {
      reject("Duplicate email within this file."); continue;
    }

    if (await clientRepo.byEmployeeId(employeeId)) {
      reject("This Employee ID is already registered."); continue;
    }
    if (await userRepo.emailExists(email)) {
      reject("This email address is already in use."); continue;
    }

    const employmentType = EMPLOYMENT_TYPES.includes(raw.employmentType as never)
      ? (raw.employmentType as string)
      : "Company Employee";

    const mealBenefit = MEAL_BENEFITS.includes(raw.mealBenefit as never)
      ? (raw.mealBenefit as string)
      : "Self Paid";

    try {
      // The email doubles as the temporary password, hashed exactly like any
      // other so it is never recoverable from the database.
      const passwordHash = await hashPassword(email);
      const clientId = genId("C");
      const userId = await userRepo.nextSequentialId();
      const phone = sanitizeText(raw.phone, 20) || null;
      const designation = sanitizeText(raw.designation, 60) || null;

      await db.transaction(async (tx) => {
        await tx.insert(users).values({
          id: userId,
          name,
          email,
          phone,
          passwordHash,
          role: "client",
          status: "active",
          department,
          designation,
          employeeId,
          employmentType,
          mealPlan: FIXED_MEAL_PLAN,
          mealBenefit,
          avatarColor: "#059669",
          mustChangePassword: true,
        });

        await tx.insert(clients).values({
          id: clientId,
          userId,
          name,
          employeeId,
          email,
          phone,
          department,
          designation,
          employmentType,
          mealPlan: FIXED_MEAL_PLAN,
          mealBenefit,
          // Bulk-imported Complimentary employees are approved off-system, so
          // no supporting document is collected here.
          supportingDocumentPath: null,
          supportingDocumentName: null,
          qrStatus: "active",
          qrToken: genId("QR"),
          status: "active",
        });
      });

      outcome.status = "created";
      results.push(outcome);
      seenEmployeeIds.add(employeeId.toLowerCase());
      seenEmails.add(email);
    } catch (err) {
      logger.error({ err, rowNumber: raw.rowNumber }, "bulk import row failed");
      reject("Could not create this account. Please check the values and retry.");
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  if (created > 0) emitCollectionChanged("clients", ["super_admin", "manager"]);

  return { created, skipped: results.length - created, results };
}

export async function updateClient(id: string, patch: Record<string, unknown>) {
  const before = await clientRepo.byId(id);
  if (!before) throw notFound("CLIENT_NOT_FOUND");

  const clean: Record<string, unknown> = {};
  if (typeof patch.name === "string") clean.name = sanitizeText(patch.name, 100);
  if (typeof patch.email === "string" && patch.email) clean.email = sanitizeEmail(patch.email);
  if (typeof patch.phone === "string") clean.phone = sanitizeText(patch.phone, 20);
  if (typeof patch.department === "string") clean.department = sanitizeText(patch.department, 60);
  if (typeof patch.designation === "string") clean.designation = sanitizeText(patch.designation, 60);
  for (const k of ["employmentType", "mealBenefit", "photoPath", "supportingDocumentPath", "supportingDocumentName"]) {
    if (patch[k] !== undefined) clean[k] = patch[k];
  }
  if (typeof patch.employeeId === "string" && patch.employeeId !== before.employeeId) {
    if (await clientRepo.byEmployeeId(patch.employeeId)) throw conflict("DUPLICATE_EMPLOYEE_ID");
    clean.employeeId = sanitizeText(patch.employeeId, 30);
  }

  if (clean.photoPath && before.photoPath && clean.photoPath !== before.photoPath) {
    await markOrphan(before.photoPath);
  }

  const [after] = await clientRepo.patch(id, clean);

  // Keep the linked login row in sync so the header avatar updates instantly.
  if (before.userId) {
    await userRepo.patch(before.userId, {
      ...(clean.name ? { name: clean.name as string } : {}),
      ...(clean.email ? { email: clean.email as string } : {}),
      ...(clean.phone !== undefined ? { phone: clean.phone as string } : {}),
      ...(clean.photoPath ? { photoPath: clean.photoPath as string } : {}),
    });
  }

  emitCollectionChanged("clients", ["super_admin", "manager"]);
  return { before, after: after! };
}

export async function runLifecycleAction(
  id: string,
  action: "suspend" | "activate" | "archive" | "restore" | "reissue-qr" | "expire-qr",
) {
  const client = await clientRepo.byId(id);
  if (!client) throw notFound("CLIENT_NOT_FOUND");

  let clientPatch: Partial<typeof clients.$inferInsert>;
  let userStatus: "active" | "suspended" | null = null;

  switch (action) {
    case "suspend":  clientPatch = { status: "suspended" }; userStatus = "suspended"; break;
    case "activate": clientPatch = { status: "active" };    userStatus = "active";    break;
    case "archive":  clientPatch = { status: "archived", prevStatus: client.status }; userStatus = "suspended"; break;
    case "restore":  clientPatch = { status: client.prevStatus ?? "active" }; userStatus = "active"; break;
    // Card lost/stolen: a brand-new token instantly kills the printed card.
    case "reissue-qr": clientPatch = { qrToken: genId("QR"), qrStatus: "active", qrIssuedAt: new Date() }; break;
    case "expire-qr":  clientPatch = { qrStatus: "expired" }; break;
  }

  const [after] = await clientRepo.patch(id, clientPatch);
  if (userStatus && client.userId) {
    await userRepo.setStatus(client.userId, userStatus);
    if (userStatus === "suspended") await revokeAllForUser(client.userId);
  }

  emitCollectionChanged("clients", ["super_admin", "manager"]);
  return { before: client, after: after! };
}

export async function departments(): Promise<string[]> {
  const rows = await db.execute<{ department: string }>(sql`
    SELECT DISTINCT department FROM clients
    WHERE department IS NOT NULL AND status <> 'archived' ORDER BY department
  `);
  return rows.map((r) => r.department);
}