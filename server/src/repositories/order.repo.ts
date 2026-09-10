// backend/src/repositories/order.repo.ts
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { orderItems, orders } from "../db/schema.js";
import { offsetOf, type Pagination } from "../lib/pagination.js";

export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;

export const orderRepo = {
  byId: (id: string) => db.query.orders.findFirst({ where: eq(orders.id, id) }),

  itemsFor: (orderIds: string[]) =>
    orderIds.length
      ? db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
      : Promise.resolve([] as OrderItemRow[]),

  async list(opts: { statuses?: string[]; clientId?: string; from?: string; to?: string } & Pagination) {
    const filters = [sql`true`];
    if (opts.statuses?.length) filters.push(inArray(orders.status, opts.statuses));
    if (opts.clientId) filters.push(eq(orders.clientId, opts.clientId));
    if (opts.from) filters.push(gte(orders.orderDate, opts.from));
    if (opts.to) filters.push(lte(orders.orderDate, opts.to));
    const where = and(...filters);

    const [rows, [count]] = await Promise.all([
      db.select().from(orders).where(where)
        .orderBy(desc(orders.createdAt)).limit(opts.pageSize).offset(offsetOf(opts)),
      db.select({ n: sql<number>`count(*)::int` }).from(orders).where(where),
    ]);
    return { rows, total: count?.n ?? 0 };
  },

  // Token board — bounded, index-backed. Newest first: with instant orders the
  // person who just scanned is the one the counter needs to see, and it stops
  // the board freezing on the first 15 orders of the day.
  boardQueue: (today: string) =>
    db.select().from(orders)
      .where(and(eq(orders.orderDate, today), eq(orders.status, "ready")))
      .orderBy(desc(orders.createdAt)).limit(15),

  mealToday: (clientId: string, today: string) =>
    db.query.orders.findFirst({
      where: and(
        eq(orders.clientId, clientId),
        eq(orders.orderDate, today),
        sql`${orders.status} NOT IN ('cancelled','rejected')`,
      ),
    }),

  lastOrderDate: async (clientId: string) => {
    const [row] = await db.select({ d: orders.orderDate }).from(orders)
      .where(eq(orders.clientId, clientId)).orderBy(desc(orders.orderDate)).limit(1);
    return row?.d ?? null;
  },
};