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

/** True while the counter is serving. */
export function orderWindowOpen(): boolean {
  const h = localHour();
  return h >= env.MEAL_ORDER_START_HOUR && h < env.MEAL_ORDER_END_HOUR;
}

/** Minutes until the window opens, or 0 if it is open or already past. */
export function minutesUntilOrderWindow(): number {
  const now = localHour() * 60 + localMinute();
  const start = env.MEAL_ORDER_START_HOUR * 60;
  return now < start ? start - now : 0;
}

/** Minutes until the window closes, or 0 once it has. */
export function minutesUntilOrderWindowCloses(): number {
  const now = localHour() * 60 + localMinute();
  const end = env.MEAL_ORDER_END_HOUR * 60;
  return Math.max(0, end - now);
}

function hourLabel(h: number): string {
  const normalised = h % 24;
  const suffix = normalised < 12 ? "AM" : "PM";
  const display = normalised % 12 === 0 ? 12 : normalised % 12;
  return `${display}:00 ${suffix}`;
}

/** e.g. "11:00 AM – 6:00 PM" — rendered verbatim in the UI. */
export function orderWindowLabel(): string {
  return `${hourLabel(env.MEAL_ORDER_START_HOUR)} \u2013 ${hourLabel(env.MEAL_ORDER_END_HOUR)}`;
}

/** e.g. "6:00 AM" — used verbatim in user-facing messages. */
export const cutoffLabel = (): string => hourLabel(env.MEAL_CANCEL_CUTOFF_HOUR);