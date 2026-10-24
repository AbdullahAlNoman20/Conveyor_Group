// admin/src/components/utils/devClock.js  (NEW)
import { apiGet } from "../services/api";

/**
 * Makes the browser follow the server's dev clock.
 *
 * The patch is installed only when the server reports a non-zero offset,
 * which can only happen with DEV_TOOLS on. In production the offset is always
 * 0, so the real Date is never touched.
 */
const RealDate = globalThis.__CCCMS_REAL_DATE__ || Date;
globalThis.__CCCMS_REAL_DATE__ = RealDate;

let offsetMs = 0;
let installed = false;
let pollTimer = null;

function install() {
  if (installed) return;
  installed = true;

  class ShiftedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(RealDate.now() + offsetMs);
      else super(...args);
    }

    static now() {
      return RealDate.now() + offsetMs;
    }
  }

  globalThis.Date = ShiftedDate;
}

export const getClockOffset = () => offsetMs;

async function fetchOffset() {
  const data = await apiGet("/public/clock");
  const next = Number(data?.offsetMs);
  return Number.isFinite(next) ? next : 0;
}

/**
 * Pulls the offset once. Called before the first render, so every screen
 * starts on the right day with no reload. Never blocks longer than `timeoutMs`.
 */
export async function initDevClock(timeoutMs = 2000) {
  try {
    const next = await Promise.race([
      fetchOffset(),
      new Promise((resolve) => setTimeout(() => resolve(0), timeoutMs)),
    ]);
    offsetMs = next;
    if (offsetMs !== 0) install();
  } catch {
    offsetMs = 0;
  }

  startPolling();
}

/**
 * Checks for a clock change. A changed day reloads the page, because almost
 * every screen computed "today" when it mounted.
 */
export async function syncDevClock() {
  try {
    const next = await fetchOffset();
    if (next === offsetMs) return false;
    offsetMs = next;
    if (offsetMs !== 0) install();
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

function startPolling() {
  if (pollTimer) return;
  // Picks up a jump made from another device or tab. Only matters while a
  // dev offset is in play or could be, and costs one tiny request.
  pollTimer = setInterval(() => {
    if (document.visibilityState === "visible") syncDevClock();
  }, 20000);
}