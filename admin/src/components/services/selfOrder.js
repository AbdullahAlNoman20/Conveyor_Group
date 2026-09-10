// admin/src/components/services/selfOrder.js
import { apiGet, apiPost } from "./api";

export async function todaysFixedMeal() {
  return apiGet("/orders/meta/todays-fixed-meal");
}

/**
 * Instant fixed-meal order. All the rules (Fixed-plan check, one-meal-per-day,
 * meal-slot reservation, notifications) now run server-side in one transaction,
 * so a race between two scans can no longer double-issue a meal.
 * source: "self_scan" (client scans the station) | "manager_scan" (manager scans the card)
 */
export async function createInstantFixedMealOrder({ source, stationCode, clientId }) {
  return apiPost("/orders/instant", { source, stationCode, clientId });
}