// server/src/lib/clock.ts
import { env } from "../config/env.js";

/**
 * Development-only clock offset, in milliseconds.
 *
 * Every date and hour decision in the app runs through this module, so shifting
 * one number simulates any point in time: a different day (to get past the
 * one-meal-per-day rule), a different hour (to test the 6 AM cancellation
 * cutoff or the 11–6 serving window), or a month of history for the cost
 * reports. Nothing else needs a test-only branch.
 *
 * Held in memory and mirrored to Redis so every worker in the process group
 * agrees. Always 0 unless DEV_TOOLS is on, which env.ts refuses in production.
 */
let devOffsetMs = 0;

export function setDevOffset(ms: number): void {
  devOffsetMs = env.DEV_TOOLS ? ms : 0;
}

export const getDevOffset = (): number => (env.DEV_TOOLS ? devOffsetMs : 0);

/** The app's idea of "now". Real time in production, shiftable in development. */
export const now = (): Date => new Date(Date.now() + getDevOffset());

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
  }).formatToParts(now());

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