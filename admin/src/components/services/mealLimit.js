// admin/src/components/services/mealLimit.js
import { apiGet } from "./api";

/**
 * Today's meal head count.
 *
 * `dailyLimit` is the number of people the kitchen is cooking for (everyone on
 * the fixed meal, minus whoever cancelled) and `served` is how many have
 * collected. The old names are kept so every screen using them still works.
 */
export async function getMealLimitStatus() {
  try {
    return await apiGet("/public/headcount");
  } catch {
    return null;
  }
}