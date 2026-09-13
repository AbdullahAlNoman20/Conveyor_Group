// backend/src/services/order.service.ts
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { orderItems, orders } from "../db/schema.js";
import { orderRepo, type OrderRow } from "../repositories/order.repo.js";
import { clientRepo, type ClientRow } from "../repositories/client.repo.js";
import { menuRepo } from "../repositories/menu.repo.js";
import { consumeMealSlot, releaseMealSlot, todayISO } from "./mealLimit.service.js";
import { notifyEvent, SOCKET_EVENTS } from "./notification.service.js";
import { emitCollectionChanged } from "../sockets/index.js";
import { genId } from "../lib/ids.js";
import { AppError, notFound } from "../lib/errors.js";
import { signedUrlMany } from "../storage/supabase.js";
import { escapeHtml } from "../lib/sanitize.js";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/**
 * Every order is created as "ready" (the meal is pre-made), so the only moves
 * left are collection and cancellation. The old awaiting_manager -> pending ->
 * accepted -> preparing chain is gone along with the approval workflow.
 */
const TRANSITIONS: Record<string, string[]> = {
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export async function todaysFixedMeal() {
  const dayName = DAY_NAMES[new Date().getDay()]!;
  const [week, menu] = await Promise.all([menuRepo.week(), menuRepo.all()]);
  const name = week.find((d) => d.day === dayName)?.mealName;
  if (!name) throw new AppError("NO_FIXED_MEAL_TODAY", 409);
  const item = menu.find((m) => m.name === name);
  return { day: dayName, name, price: item ? Number(item.price) : 0, menuItemId: item?.id ?? null };
}

import { assertNotCancelled, clearCollection, markCollected } from "./attendance.service.js";
import { orderWindowLabel, orderWindowOpen } from "../lib/clock.js";

function assertOrderable(client: ClientRow): void {
  if (client.status !== "active") throw new AppError("ACCOUNT_SUSPENDED", 403);
  if (client.qrStatus !== "active") throw new AppError("EXPIRED_QR", 403);
  if (client.mealPlan !== "Fixed Company Meal") throw new AppError("NOT_FIXED_MEAL_CLIENT", 403);
}

/**
 * The counter only serves between the configured hours. Enforced here rather
 * than in each route so every path — self-order, station scan and Manager scan
 * — is bound by the same window, and a disabled button can't be bypassed.
 */
function assertOrderWindow(): void {
  if (!orderWindowOpen()) {
    throw new AppError(
      "ORDER_WINDOW_CLOSED",
      409,
      { window: orderWindowLabel() },
      `Meal ordering is open ${orderWindowLabel()} only.`,
    );
  }
}

// Translates the DB unique-index violation into the exact UI wording.
function rethrowDuplicate(err: unknown): never {
  if ((err as { code?: string })?.code === "23505") {
    const c = (err as { constraint_name?: string }).constraint_name ?? "";
    if (c.includes("one_meal_per_day")) throw new AppError("ORDER_ALREADY_PLACED", 409);
  }
  throw err;
}

interface CreateArgs {
  client: ClientRow;
  placedByUserId: string;
  specialInstructions: string;
  selfPlaced: boolean;
  instantOrder: boolean;
}

async function createFixedMealOrder(args: CreateArgs): Promise<OrderRow> {
  const orderDate = todayISO();

  const existing = await orderRepo.mealToday(args.client.id, orderDate);
  if (existing) {
    throw new AppError("ORDER_ALREADY_PLACED", 409, { orderId: existing.id },
      `${args.client.name.split(" ")[0]} has already collected today's meal — only one meal per day is allowed.`);
  }

  assertOrderWindow();

  // Someone who opted out before the cutoff has no meal waiting for them.
  await assertNotCancelled(args.client.id, orderDate);

  const meal = await todaysFixedMeal();
  const isComplimentary = args.client.mealBenefit === "Complimentary";
  // The price comes from the menu row, never from the request body.
  const amount = isComplimentary ? 0 : meal.price;

  const created = await db.transaction(async (tx) => {
    await consumeMealSlot(orderDate);

    const [row] = await tx.insert(orders).values({
      id: genId("ORD"),
      clientId: args.client.id,
      clientName: args.client.name,
      employeeId: args.client.employeeId,
      department: args.client.department,
      // There is no dine-in/take-away choice any more: every order is the same
      // pre-made fixed meal, collected at the counter off the token board.
      tableNumber: null,
      orderType: "self_order",
      priority: "normal",
      specialInstructions: args.specialInstructions,
      amount: String(amount), // no VAT anywhere
      paymentMethod: isComplimentary ? "complimentary" : "salary",
      status: "ready",
      selfPlaced: args.selfPlaced,
      instantOrder: args.instantOrder,
      consumedMealSlot: true,
      orderDate,
      placedByUserId: args.placedByUserId,
    }).returning();

    await tx.insert(orderItems).values({
      orderId: row!.id,
      menuItemId: meal.menuItemId,
      name: meal.name,
      qty: 1,
      unitPrice: String(meal.price),
    });

    // Complimentary clients are billed nothing, so their running total is
    // left untouched rather than incremented by zero.
    if (amount > 0) {
      await tx.execute(sql`
        UPDATE clients
        SET monthly_bill = monthly_bill + ${amount}, updated_at = now()
        WHERE id = ${args.client.id}
      `);
    }

    return row!;
  }).catch(rethrowDuplicate);

  // Recorded outside the transaction on purpose: a failure here must not roll
  // back a meal the client has already been handed.
  await markCollected(args.client, created.id, amount, orderDate);

  return created;
}

/**
 * Client places their own order from PlaceOrder.jsx.
 *
 * There is no approval pipeline: the fixed meal is pre-made, so the order goes
 * straight to "ready" and lands on the token board immediately — exactly the
 * same outcome as a Manager QR scan. Nothing waits on manager/kitchen steps.
 */
export async function placeOrder(input: {
  client: ClientRow;
  placedByUserId: string;
}): Promise<OrderRow> {
  assertOrderable(input.client);

  const order = await createFixedMealOrder({
    client: input.client,
    placedByUserId: input.placedByUserId,
    specialInstructions: "Self-placed fixed-meal order — no approval steps",
    selfPlaced: true,
    instantOrder: false,
  });

  await notifyEvent(SOCKET_EVENTS.FOOD_READY, {
    message: `Order ${order.id} is ready for collection.`,
    recipientUserIds: input.client.userId ? [input.client.userId] : [],
  });
  await notifyEvent(SOCKET_EVENTS.INSTANT_ORDER_CREATED, {
    message: `${input.client.name} placed order ${order.id} — sent straight to the token board.`,
    recipientRoles: ["manager", "super_admin"],
  });

  emitCollectionChanged("orders", ["manager", "super_admin", "client"]);
  return order;
}

// Instant fixed meal — pre-made, so it skips every approval step and lands
// straight on the token board (self-order station scan, or Manager scan).
export async function createInstantFixedMealOrder(input: {
  clientId: string;
  source: "self_scan" | "manager_scan";
  placedByUserId: string;
}): Promise<OrderRow> {
  const client = await clientRepo.byId(input.clientId);
  if (!client) throw notFound("CLIENT_NOT_FOUND");
  assertOrderable(client);

  const order = await createFixedMealOrder({
    client,
    placedByUserId: input.placedByUserId,
    specialInstructions: input.source === "manager_scan"
      ? "Instant fixed-meal order — Manager QR scan (no approval steps)"
      : "Instant fixed-meal order — Self-Order Station QR (no approval steps)",
    selfPlaced: input.source === "self_scan",
    instantOrder: true,
  });

  await notifyEvent(SOCKET_EVENTS.FOOD_READY, {
    message: `Order ${order.id} is ready for collection.`,
    recipientUserIds: client.userId ? [client.userId] : [],
  });
  await notifyEvent(SOCKET_EVENTS.INSTANT_ORDER_CREATED, {
    message: input.source === "manager_scan"
      ? `Instant fixed-meal order ${order.id} created for ${client.name} via QR scan.`
      : `${client.name} self-ordered ${order.id} — sent straight to the token board.`,
    recipientRoles: ["manager", "super_admin"],
  });

  emitCollectionChanged("orders", ["manager", "super_admin", "client"]);
  return order;
}

export async function changeStatus(orderId: string, next: string): Promise<OrderRow> {
  const current = await orderRepo.byId(orderId);
  if (!current) throw notFound("ORDER_NOT_FOUND");

  const allowed = TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(next)) {
    throw new AppError("INVALID_STATUS_TRANSITION", 400, { from: current.status, allowed });
  }

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx.update(orders)
      .set({ status: next, updatedAt: new Date() }).where(eq(orders.id, orderId)).returning();

    if (next === "cancelled" || next === "rejected") {
      // The meal goes back into today's available count...
      if (current.consumedMealSlot) await releaseMealSlot(current.orderDate);

      // ...and the client stops being billed for it. GREATEST guards the
      // CHECK constraint if a bill was ever reset by hand.
      const amount = Number(current.amount);
      if (amount > 0) {
        await tx.execute(sql`
          UPDATE clients
          SET monthly_bill = GREATEST(0, monthly_bill - ${amount}), updated_at = now()
          WHERE id = ${current.clientId}
        `);
      }
    }

    return row!;
  });

  // The day reverts to pending, so the nightly sweep can still catch it.
  if (next === "cancelled" || next === "rejected") {
    await clearCollection(current.clientId, current.orderDate);
  }

  if (next === "ready") {
    const client = await clientRepo.byId(updated.clientId);
    await notifyEvent(SOCKET_EVENTS.FOOD_READY, {
      message: `Order ${updated.id} is ready for collection.`,
      recipientUserIds: client?.userId ? [client.userId] : [],
    });
  }

  emitCollectionChanged("orders", ["manager", "super_admin", "client"]);
  return updated;
}

// Read model shaped exactly like the old mock order objects, so no screen
// needs restructuring. `subtotal`/`tax` are kept at amount/0 for compatibility.
export async function hydrateOrders(rows: OrderRow[]) {
  const items = await orderRepo.itemsFor(rows.map((r) => r.id));
  const grouped = new Map<string, { name: string; qty: number; unitPrice: number }[]>();
  for (const i of items) {
    const list = grouped.get(i.orderId) ?? [];
    list.push({ name: i.name, qty: i.qty, unitPrice: Number(i.unitPrice) });
    grouped.set(i.orderId, list);
  }

  return rows.map((o) => ({
    id: o.id,
    clientId: o.clientId,
    clientName: escapeHtml(o.clientName),
    employeeId: o.employeeId,
    department: o.department,
    tableNumber: o.tableNumber,
    orderType: o.orderType,
    priority: o.priority,
    specialInstructions: escapeHtml(o.specialInstructions ?? ""),
    items: grouped.get(o.id) ?? [],
    subtotal: Number(o.amount),
    amount: Number(o.amount),
    paymentMethod: o.paymentMethod,
    status: o.status,
    selfPlaced: o.selfPlaced,
    instantOrder: o.instantOrder,
    createdAt: o.createdAt.toISOString(),
  }));
}

// Public token board: names + photos only. No employee IDs, no amounts.
export async function boardQueue() {
  const rows = await orderRepo.boardQueue(todayISO());
  const roster = await clientRepo.allLite();
  const byId = new Map(roster.map((c) => [c.id, c.photoPath]));
  const urls = await signedUrlMany(roster.map((c) => c.photoPath));

  return rows.map((o) => ({
    id: o.id,
    clientName: escapeHtml(o.clientName),
    tableNumber: o.tableNumber,
    photo: urls.get(byId.get(o.clientId) ?? "") ?? null,
    createdAt: o.createdAt.toISOString(),
  }));
}

export { sql };