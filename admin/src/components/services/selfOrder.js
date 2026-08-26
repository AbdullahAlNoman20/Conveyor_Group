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
export async function createInstantFixedMealOrder({ client, clients, weeklyMenu, menu, source }) {
  if (client.mealPlan !== "Fixed Company Meal") {
    throw new Error("Instant ordering is only available for Fixed Company Meal clients.");
  }

  const { name: mealName, price: mealPrice } = todaysFixedMeal(weeklyMenu, menu);
  const isComplimentary = client.mealBenefit === "Complimentary";

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
    paymentMethod: isComplimentary ? "complimentary" : "wallet",
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
    recipientRoles: ["waiter"],
  });
  await notifyEvent(SOCKET_EVENTS.INSTANT_ORDER_CREATED, {
    message:
      source === "manager_scan"
        ? `Instant fixed-meal order ${order.id} created for ${client.name} via QR scan.`
        : `${client.name} self-ordered ${order.id} at the station — sent straight to the kitchen board.`,
    recipientRoles: ["manager", "kitchen_head"],
  });

  return order;
}