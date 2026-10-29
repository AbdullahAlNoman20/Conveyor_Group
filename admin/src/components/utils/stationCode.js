// admin/src/components/utils/stationCode.js
const PARAM = "c";

/** The link printed on the station QR. Any phone camera opens it directly. */
export function stationUrl(code) {
  return `${window.location.origin}/self-order?${PARAM}=${encodeURIComponent(code || "")}`;
}

/**
 * Accepts either the new link or an old raw code, so posters printed before
 * this change keep working with the in-app scanner.
 */
export function stationCodeFrom(scanned) {
  const text = String(scanned || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    return (url.searchParams.get(PARAM) || url.searchParams.get("code") || "").trim().slice(0, 120);
  } catch {
    return text.slice(0, 120);
  }
}

const PENDING_KEY = "cccms.selfOrderPending";
const PENDING_TTL_MS = 10 * 60 * 1000;

/** Remembers a scanned station while the employee signs in. */
export function rememberPendingStation(code) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    /* private mode: they can scan again after signing in */
  }
}

/** Returns and clears a pending station, if it is still fresh. */
export function takePendingStation() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    if (!raw) return "";
    const { code, at } = JSON.parse(raw);
    if (!code || typeof code !== "string" || Date.now() - Number(at) > PENDING_TTL_MS) return "";
    return code.slice(0, 120);
  } catch {
    return "";
  }
}