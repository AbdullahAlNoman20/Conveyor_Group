// Thin helper around the Browser Notification API + a simple beep, used by
// NotificationContext (SRS Section 20.4 — In-App / Browser / Sound Alert).

export async function requestBrowserPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function showBrowserNotification(title, options = {}) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { icon: "/logo.jpeg", ...options });
  } catch {
    // Some browsers throw if called outside a user gesture context; ignore.
  }
}

let audioCtx;
export function playAlertSound() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch {
    // Audio not available/allowed — fail silently, in-app + browser notifications still work.
  }
}
