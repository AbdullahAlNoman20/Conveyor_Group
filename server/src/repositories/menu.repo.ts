// backend/src/repositories/menu.repo.ts
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { menuItems, weeklyMenu } from "../db/schema.js";

export type MenuRow = typeof menuItems.$inferSelect;

export const menuRepo = {
  all: () => db.select().from(menuItems).where(isNull(menuItems.deletedAt)).orderBy(asc(menuItems.id)),

  available: () => db.select().from(menuItems)
    .where(and(isNull(menuItems.deletedAt), eq(menuItems.available, true))).orderBy(asc(menuItems.id)),

  byId: (id: string) =>
    db.query.menuItems.findFirst({ where: and(eq(menuItems.id, id), isNull(menuItems.deletedAt)) }),

  byName: (name: string) =>
    db.query.menuItems.findFirst({
      where: and(sql`lower(${menuItems.name}) = ${name.toLowerCase()}`, isNull(menuItems.deletedAt)),
    }),

  insert: (row: typeof menuItems.$inferInsert) => db.insert(menuItems).values(row).returning(),

  patch: (id: string, patch: Partial<typeof menuItems.$inferInsert>) =>
    db.update(menuItems).set({ ...patch, updatedAt: new Date() }).where(eq(menuItems.id, id)).returning(),

  softDelete: (id: string) =>
    db.update(menuItems).set({ deletedAt: new Date(), available: false }).where(eq(menuItems.id, id)).returning(),

  week: () => db.select().from(weeklyMenu),
};