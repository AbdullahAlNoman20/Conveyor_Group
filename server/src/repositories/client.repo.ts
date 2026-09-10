// backend/src/repositories/client.repo.ts
import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { clients } from "../db/schema.js";
import { offsetOf, type Pagination } from "../lib/pagination.js";

export type ClientRow = typeof clients.$inferSelect;

export const clientRepo = {
  byId: (id: string) => db.query.clients.findFirst({ where: eq(clients.id, id) }),
  byUserId: (userId: string) => db.query.clients.findFirst({ where: eq(clients.userId, userId) }),
  byQrToken: (token: string) => db.query.clients.findFirst({ where: eq(clients.qrToken, token) }),
  byEmployeeId: (employeeId: string) =>
    db.query.clients.findFirst({ where: sql`lower(${clients.employeeId}) = ${employeeId.toLowerCase()}` }),

  async list(opts: { q?: string; status: string } & Pagination) {
    const filters = [];
    if (opts.status === "all") filters.push(ne(clients.status, "archived"));
    else if (opts.status === "archived") filters.push(eq(clients.status, "archived"));
    else filters.push(eq(clients.status, opts.status));

    if (opts.q) filters.push(or(ilike(clients.name, `%${opts.q}%`), ilike(clients.employeeId, `%${opts.q}%`)));
    const where = and(...filters);

    const [rows, [count]] = await Promise.all([
      db.select().from(clients).where(where)
        .orderBy(desc(clients.createdAt)).limit(opts.pageSize).offset(offsetOf(opts)),
      db.select({ n: sql<number>`count(*)::int` }).from(clients).where(where),
    ]);
    return { rows, total: count?.n ?? 0 };
  },

  allLite: () =>
    db.select({ id: clients.id, name: clients.name, photoPath: clients.photoPath })
      .from(clients).where(ne(clients.status, "archived")),

  insert: (row: typeof clients.$inferInsert) => db.insert(clients).values(row).returning(),

  patch: (id: string, patch: Partial<typeof clients.$inferInsert>) =>
    db.update(clients).set({ ...patch, updatedAt: new Date() }).where(eq(clients.id, id)).returning(),
};