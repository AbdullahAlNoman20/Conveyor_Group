// FILE: src/components/services/selfOrder.js (NEW)
//
// Single source of truth for "instant" fixed-meal orders — used by BOTH:
//   1. A Client scanning the Self-Order Station QR from their own dashboard.
//   2. A Manager scanning a Fixed-Meal client's QR (skips menu selection,
//      Manager approval, and Kitchen approval entirely).
// In both cases the order is today's fixed meal, pre-made, so it goes
// straight to "ready" — no awaiting_manager/pending/accepted/preparing
// steps — and appears on the Token Board immediately. Everywhere else in
// the system (client history, manager dashboard, super admin reports,
// wallet/monthly-bill, notifications) keeps working exactly as it does for
// any other order, because this still goes through dataStore.insert +
// recordOrderEarning + notifyEvent, same as every other order path.
import { dataStore } from "./dataStore";
import { genId } from "../utils/idGenerator";
import { SOCKET_EVENTS } from "./socket";
import { notifyEvent } from "./notifyEvent";
import { recordOrderEarning } from "./earnings";
import { orderRecipientName } from "../utils/orderRecipient";
import { consumeMealSlot } from "./mealLimit";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function todaysFixedMeal(weeklyMenu, menu) {
  const todayName = DAY_NAMES[new Date().getDay()];
  const name = (weeklyMenu || []).find((d) => d.day === todayName)?.meal || "Today's Set Meal";
  const price = (menu || []).find((m) => m.name === name)?.price ?? 0;
  return { name, price };
}

/**
 * source: "self_scan" (client scanned the station QR themselves) or
 *         "manager_scan" (manager scanned the client's own QR).
 * Throws if the client isn't on the Fixed Company Meal plan — callers
 * should check that before calling, this is a safety net.
 */
export async function createInstantFixedMealOrder({ client, clients, orders, weeklyMenu, menu, source }) {
  if (client.mealPlan !== "Fixed Company Meal") {
    throw new Error("Instant ordering is only available for Fixed Company Meal clients.");
  }

  // Once-per-day check — applies regardless of HOW the meal was ordered
  // earlier today (self-scan, manager-scan, or manual), so nobody can
  // double-collect by mixing entry points.
  const todayStr = new Date().toDateString();
  const alreadyOrderedToday = (orders || []).some((o) => {
    const sameDay = new Date(o.createdAt).toDateString() === todayStr;
    return sameDay && o.clientName === client.name && !["cancelled", "rejected"].includes(o.status);
  });
  if (alreadyOrderedToday) {
    throw new Error(
      `${client.name.split(" ")[0]} has already collected today's meal — only one meal per day is allowed.`
    );
  }

  const { name: mealName, price: mealPrice } = todaysFixedMeal(weeklyMenu, menu);
  const isComplimentary = client.mealBenefit === "Complimentary";

  // Reserve one of today's 300 prepared meals — throws if none are left.
  await consumeMealSlot();

  const order = {
    id: genId("ORD"),
    clientName: client.name,
    employeeId: client.employeeId,
    department: client.department,
    tableNumber: null,
    orderType: "self_order",
    priority: "normal",
    specialInstructions:
      source === "manager_scan"
        ? "Instant fixed-meal order — Manager QR scan (no approval steps)"
        : "Instant fixed-meal order — Self-Order Station QR (no approval steps)",
    items: [{ name: mealName, qty: 1, unitPrice: mealPrice }],
    subtotal: mealPrice,
    discount: 0,
    tax: 0,
    amount: mealPrice,
    // Instant/self-order meals are always billed to salary (wallet stays
    // available separately for manual orders where the person explicitly
    // chooses "Pay From: Wallet").
    paymentMethod: isComplimentary ? "complimentary" : "salary",
    // Skips awaiting_manager / pending / accepted / preparing on purpose —
    // the fixed meal is already prepared, so this goes straight to the
    // Token Board as ready for collection.
    status: "ready",
    selfPlaced: source === "self_scan",
    instantOrder: true,
    createdAt: new Date().toISOString(),
  };

  await dataStore.insert("orders", order);

  // Complimentary clients never touch wallet/monthly-bill — everyone else
  // gets deducted exactly like any other order (same shared helper).
  if (!isComplimentary) {
    await recordOrderEarning(order, clients);
  }

  await notifyEvent(SOCKET_EVENTS.FOOD_READY, {
    message: `Order ${order.id} is ready for collection.`,
    recipientNames: [orderRecipientName(order)],
  });
  await notifyEvent(SOCKET_EVENTS.INSTANT_ORDER_CREATED, {
    message:
      source === "manager_scan"
        ? `Instant fixed-meal order ${order.id} created for ${client.name} via QR scan.`
        : `${client.name} self-ordered ${order.id} — sent straight to the token board.`,
    recipientRoles: ["manager", "super_admin"],
  });

  return order;
}