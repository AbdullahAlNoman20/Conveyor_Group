// FILE: src/components/services/earnings.js (NEW — single source of truth for money movement + earning)
import { dataStore } from "./dataStore";
import { genId } from "../utils/idGenerator";

export async function recordOrderEarning(order, clients) {
  const billingName = order.billedToClient || order.clientName;
  const isGuestLabel = typeof billingName === "string" && billingName.startsWith("Guest - ");
  const client = (clients || []).find((c) => c.name === billingName && !isGuestLabel);
  const method = order.paymentMethod === "salary" ? "salary" : "wallet";

  if (client) {
    if (method === "wallet") {
      await dataStore.update("clients", (c) => c.id === client.id, {
        walletBalance: Math.max(0, (client.walletBalance || 0) - order.amount),
      });
    } else {
      await dataStore.update("clients", (c) => c.id === client.id, {
        monthlyBill: (client.monthlyBill || 0) + order.amount,
      });
    }
  }

  await dataStore.insert("walletTransactions", {
    id: genId("WT"),
    clientId: client?.id || null,
    
    clientLabel: client ? client.name : order.clientName,
    type: order.snackOnly ? "Snack" : "Meal",
    amount: -order.amount,
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: client ? method : "cash",
    source: "order",
    orderId: order.id,
    remarks: (order.items || []).map((i) => `${i.qty}x ${i.name}`).join(", "),
  });
}