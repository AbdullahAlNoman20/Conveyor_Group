// admin/src/components/utils/haptics.js

/**
 * A short buzz for "this one cannot be served".
 *
 * At a counter the phone is often held low and glanced at, so a failure that
 * only shows on screen is easy to miss and the meal gets handed over anyway.
 * The buzz carries the refusal without the Manager having to read anything.
 *
 * Deliberately only used for refusals. A buzz on every successful scan is
 * noise, and noise is what teaches people to ignore it.
 */
export function buzzOnBlocked() {
  try {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;

    // Two short pulses rather than one long one: a single buzz reads as an
    // incoming notification, a double as a refusal.
    navigator.vibrate([90, 70, 90]);
  } catch {
    // Desktop, iOS Safari, or a browser that blocks it before a tap. Nothing
    // to recover from, the screen still says what happened.
  }
}

/** True when this device can actually buzz, for a one-off hint in the UI. */
export const canVibrate = () =>
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function";