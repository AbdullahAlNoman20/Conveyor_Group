// backend/src/services/accountRequest.service.ts
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { accountRequests } from "../db/schema.js";
import { createClientWithLogin } from "./client.service.js";
import { notifyEvent, SOCKET_EVENTS } from "./notification.service.js";
import { clientRepo } from "../repositories/client.repo.js";
import { genId } from "../lib/ids.js";
import { conflict, notFound } from "../lib/errors.js";
import { escapeHtml, sanitizeEmail, sanitizeText } from "../lib/sanitize.js";
import { signedUrl } from "../storage/supabase.js";
import { emitCollectionChanged } from "../sockets/index.js";
import { offsetOf, type Pagination } from "../lib/pagination.js";

export async function submitRequest(input: Record<string, unknown>) {
  const employeeId = sanitizeText(input.employeeId, 30);

  if (await clientRepo.byEmployeeId(employeeId)) throw conflict("DUPLICATE_EMPLOYEE_ID");
  const dup = await db.query.accountRequests.findFirst({
    where: and(eq(accountRequests.status, "pending"),
      sql`lower(${accountRequests.employeeId}) = ${employeeId.toLowerCase()}`),
  });
  if (dup) throw conflict("DUPLICATE_EMPLOYEE_ID", { message: "A pending request already exists for this Employee ID." });

  const [row] = await db.insert(accountRequests).values({
    id: genId("AR"),
    photoPath: (input.photoPath as string | undefined) ?? null,
    name: sanitizeText(input.name, 100),
    employeeId,
    email: sanitizeEmail(input.email),
    phone: sanitizeText(input.phone, 20) || null,
    department: sanitizeText(input.department, 60),
    designation: sanitizeText(input.designation, 60) || null,
    mealBenefit: input.mealBenefit as string,
    supportingDocumentPath: (input.supportingDocumentPath as string | undefined) ?? null,
    supportingDocumentName: sanitizeText(input.supportingDocumentName, 255) || null,
    status: "pending",
  }).returning();

  await notifyEvent(SOCKET_EVENTS.ACCOUNT_REQUEST_SUBMITTED, {
    message: `New account request from ${row!.name} is waiting for review.`,
    recipientRoles: ["super_admin"],
  });
  emitCollectionChanged("accountRequests", ["super_admin"]);
  return row!;
}

export async function listRequests(opts: { status?: string } & Pagination) {
  const where = opts.status ? eq(accountRequests.status, opts.status) : sql`true`;
  const [rows, [count]] = await Promise.all([
    db.select().from(accountRequests).where(where)
      .orderBy(desc(accountRequests.createdAt)).limit(opts.pageSize).offset(offsetOf(opts)),
    db.select({ n: sql<number>`count(*)::int` }).from(accountRequests).where(where),
  ]);
  return { items: await Promise.all(rows.map(toPublic)), total: count?.n ?? 0 };
}

export async function getRequest(id: string) {
  const row = await db.query.accountRequests.findFirst({ where: eq(accountRequests.id, id) });
  if (!row) throw notFound("REQUEST_NOT_FOUND");
  return toPublic(row);
}

export async function approve(id: string, actorUserId: string) {
  const req = await db.query.accountRequests.findFirst({ where: eq(accountRequests.id, id) });
  if (!req) throw notFound("REQUEST_NOT_FOUND");
  if (req.status !== "pending") throw conflict("VALIDATION_ERROR", { message: "This request has already been decided." });

  const created = await createClientWithLogin({
    name: req.name,
    employeeId: req.employeeId,
    email: req.email,
    phone: req.phone ?? undefined,
    department: req.department,
    designation: req.designation ?? undefined,
    employmentType: req.employmentType,
    mealBenefit: req.mealBenefit,
    photoPath: req.photoPath ?? undefined,
    supportingDocumentPath: req.supportingDocumentPath ?? undefined,
    supportingDocumentName: req.supportingDocumentName ?? undefined,
  });

  await db.update(accountRequests)
    .set({ status: "approved", decidedBy: actorUserId, decidedAt: new Date() })
    .where(eq(accountRequests.id, id));

  await notifyEvent(SOCKET_EVENTS.ACCOUNT_REQUEST_SUBMITTED, {
    message: "Your account has been approved! Check your email for login details.",
    recipientUserIds: [created.userId],
  });
  emitCollectionChanged("accountRequests", ["super_admin"]);

  // Credentials are returned exactly ONCE, for the WelcomeEmailPage preview.
  return {
    request: req,
    credentials: {
      name: created.client.name,
      email: created.email,
      password: created.password,
      role: "Client (Fixed Company Meal)",
      userId: created.userId,
      qrToken: created.client.id,
    },
  };
}

export async function reject(id: string, reason: string, actorUserId: string) {
  const req = await db.query.accountRequests.findFirst({ where: eq(accountRequests.id, id) });
  if (!req) throw notFound("REQUEST_NOT_FOUND");
  if (req.status !== "pending") throw conflict("VALIDATION_ERROR", { message: "This request has already been decided." });

  const [row] = await db.update(accountRequests)
    .set({ status: "rejected", rejectionReason: sanitizeText(reason, 300), decidedBy: actorUserId, decidedAt: new Date() })
    .where(eq(accountRequests.id, id)).returning();

  emitCollectionChanged("accountRequests", ["super_admin"]);
  return row!;
}

async function toPublic(r: typeof accountRequests.$inferSelect) {
  return {
    id: r.id,
    name: escapeHtml(r.name),
    employeeId: r.employeeId,
    email: r.email,
    phone: r.phone,
    department: escapeHtml(r.department),
    designation: escapeHtml(r.designation ?? ""),
    employmentType: r.employmentType,
    mealPlan: r.mealPlan,
    mealBenefit: r.mealBenefit,
    photo: await signedUrl(r.photoPath),
    supportingDocument: await signedUrl(r.supportingDocumentPath),
    supportingDocumentName: r.supportingDocumentName,
    status: r.status,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toISOString(),
  };
}