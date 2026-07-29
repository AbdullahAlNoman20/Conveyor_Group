// Basic client-side sanitization. This is a defense-in-depth / UX layer only —
// the real backend MUST re-sanitize and use parameterized queries
// (SRS Section 28.1). Never trust client-side sanitization alone.

/**
 * Strips angle brackets and trims/truncates free-text input.
 * Prevents naive script-tag injection from being stored in localStorage
 * mock data and later rendered unescaped.
 */
export function sanitizeText(value, maxLength = 255) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeNumber(value, { min = -Infinity, max = Infinity } = {}) {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.min(max, Math.max(min, n));
}

export function sanitizeEmail(value) {
  const clean = sanitizeText(value, 254).toLowerCase();
  return clean;
}

/** Escapes HTML special characters for any place we must render raw text. */
export function escapeHtml(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
