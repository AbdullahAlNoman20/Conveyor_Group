// backend/src/services/staff.service.ts
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { managers, users } from "../db/schema.js";
import { userRepo } from "../repositories/user.repo.js";
import { hashPassword } from "../lib/password.js";
import { deriveEmail, formatSequentialId, generatePassword } from "../lib/ids.js";
import { conflict, notFound } from "../lib/errors.js";
import { sanitizeEmail, sanitizeText } from "../lib/sanitize.js";
import { revokeAllForUser } from "./auth.service.js";
import { emitCollectionChanged } from "../sockets/index.js";

async function nextManagerId(): Promise<string> {
  const rows = await db.execute<{ n: number }>(sql`
    SELECT COALESCE(MAX(substring(id from 4)::int), 0) + 1 AS n
    FROM managers WHERE id ~ '^MG-[0-9]+$'
  `);
  return formatSequentialId("MG-", rows[0]?.n ?? 1);
}

export const listManagers = () => db.select().from(managers).orderBy(managers.id);

export async function findManager(id: string) {
  const [row] = await db.select().from(managers).where(eq(managers.id, id)).limit(1);
  if (!row) throw notFound();
  return row;
}

export async function createManager(input: {
  name: string; email: string; phone?: string;
  department?: string; designation?: string; status: "active" | "inactive";
}) {
  const name = sanitizeText(input.name, 100);
  const email = input.email ? sanitizeEmail(input.email) : deriveEmail(name);
  if (await userRepo.emailExists(email)) throw conflict("DUPLICATE_EMAIL");

  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  const managerId = await nextManagerId();
  const userId = await userRepo.nextSequentialId();

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId, name, email,
      phone: sanitizeText(input.phone, 20) || null,
      passwordHash, role: "manager",
      status: input.status === "active" ? "active" : "disabled",
      department: sanitizeText(input.department, 60) || "Restaurant Operations",
      designation: sanitizeText(input.designation, 60) || "Restaurant Manager",
      // Same as clients: the generated password is handed over out of band.
      avatarColor: "#eb2a2d", mustChangePassword: false,
    });
    await tx.insert(managers).values({ id: managerId, userId, name, email, status: input.status });
  });

  emitCollectionChanged("managers", ["super_admin"]);
  return { managerId, userId, email, password, name };
}

export async function toggleManager(id: string) {
  const row = await findManager(id);
  const next = row.status === "active" ? "disabled" : "active";
  await db.update(managers).set({ status: next }).where(eq(managers.id, id));
  if (row.userId) {
    await userRepo.setStatus(row.userId, next === "disabled" ? "suspended" : "active");
    if (next === "disabled") await revokeAllForUser(row.userId);
  }
  emitCollectionChanged("managers", ["super_admin"]);
  return { before: row, after: { ...row, status: next } };
}

export async function deleteManager(id: string) {
  const row = await findManager(id);
  await db.transaction(async (tx) => {
    await tx.delete(managers).where(eq(managers.id, id));
    // The user row is never hard-deleted (audit/FK integrity) — only disabled.
    if (row.userId) await tx.update(users).set({ status: "disabled" }).where(eq(users.id, row.userId));
  });
  if (row.userId) await revokeAllForUser(row.userId);
  emitCollectionChanged("managers", ["super_admin"]);
  return row;
}