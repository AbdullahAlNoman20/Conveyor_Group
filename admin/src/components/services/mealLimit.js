// admin/src/components/services/mealLimit.js
import { apiGet } from "./api";

// Reservation is atomic and server-side now; the client only reads the count.
export async function getMealLimitStatus() {
  try {
    return await apiGet("/public/meal-limit");
  } catch {
    return { dailyLimit: 0, served: 0, remaining: 0 };
  }
}