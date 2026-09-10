// backend/src/repositories/user.repo.ts
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

export type UserRow = typeof users.$inferSelect;

export const userRepo = {
  byId: (id: string) => db.query.users.findFirst({ where: eq(users.id, id) }),

  byEmail: (email: string) =>
    db.query.users.findFirst({ where: sql`lower(${users.email}) = ${email.toLowerCase()}` }),

  emailExists: async (email: string, exceptId?: string) => {
    const base = sql`lower(${users.email}) = ${email.toLowerCase()}`;
    const rows = await db.select({ id: users.id }).from(users)
      .where(exceptId ? and(base, sql`${users.id} <> ${exceptId}`) : base).limit(1);
    return rows.length > 0;
  },

  patch: (id: string, patch: Partial<typeof users.$inferInsert>) =>
    db.update(users).set({ ...patch, updatedAt: new Date() }).where(eq(users.id, id)).returning(),

  setStatus: (id: string, status: "active" | "suspended" | "disabled") =>
    db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, id)).returning(),

  async nextSequentialId(): Promise<string> {
    const rows = await db.execute<{ n: number }>(sql`
      SELECT COALESCE(MAX(substring(id from 3)::int), 0) + 1 AS n
      FROM users WHERE id ~ '^U-[0-9]+$'
    `);
    return `U-${String(rows[0]?.n ?? 1).padStart(3, "0")}`;
  },
};