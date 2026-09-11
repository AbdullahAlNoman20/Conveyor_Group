// server/src/lib/clock.ts
import { env } from "../config/env.js";

/**
 * All day/hour logic runs in APP_TIMEZONE, never UTC.
 *
 * This matters more than it looks: the server runs in UTC, so
 * `new Date().toISOString().slice(0,10)` returns the PREVIOUS day for every
 * request made between midnight and 06:00 Dhaka time. That silently broke the
 * one-meal-per-day rule and would break the 6am cancellation cutoff too.
 */
const parts = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: env.APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

function read(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of parts()) if (p.type !== "literal") out[p.type] = p.value;
  return out;
}

/** Today's business date as YYYY-MM-DD in the configured zone. */
export function businessDate(): string {
  const p = read();
  return `${p.year}-${p.month}-${p.day}`;
}

/** Local wall-clock hour (0-23) in the configured zone. */
export function localHour(): number {
  // Intl renders midnight as "24" in some locales; normalise it.
  return Number(read().hour) % 24;
}

export function localMinute(): number {
  return Number(read().minute);
}

/** Minutes remaining until the cancellation cutoff, or 0 once it has passed. */
export function minutesUntilCutoff(): number {
  const now = localHour() * 60 + localMinute();
  const cutoff = env.MEAL_CANCEL_CUTOFF_HOUR * 60;
  return Math.max(0, cutoff - now);
}

export const cancellationOpen = () => minutesUntilCutoff() > 0;

/** e.g. "6:00 AM" — used verbatim in user-facing messages. */
export function cutoffLabel(): string {
  const h = env.MEAL_CANCEL_CUTOFF_HOUR;
  const suffix = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${suffix}`;
}