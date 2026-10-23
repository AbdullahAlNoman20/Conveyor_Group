// admin/src/components/shared/mealStatus.js

/**
 * What to call today's meal state, in words that are true at the time they are
 * read.
 *
 * "Not collected yet" is only honest while the counter is open. Before it
 * opens the meal has not been missed, and after it closes "yet" is wrong,
 * because there is no yet left.
 */
export function mealStatusLabel(status, { windowOpen = true, windowLabel = "" } = {}) {
  if (status === "collected") return "Collected";
  if (status === "cancelled") return "Cancelled";
  if (status === "no_show") return "Missed";

  if (windowOpen) return "Not collected yet";

  // Still pending with the counter shut means the day is over for them, and
  // the nightly charge will mark it missed.
  return windowLabel ? `Counter opens ${windowLabel}` : "Counter closed";
}

export const MEAL_STATUS_TONE = {
  collected: "active",
  cancelled: "cancelled",
  no_show: "pending",
  pending: "expired",
};