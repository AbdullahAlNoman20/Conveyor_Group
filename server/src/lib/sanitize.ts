// backend/src/lib/sanitize.ts
export function sanitizeText(value: unknown, maxLength = 255): string {
  if (typeof value !== "string") return "";
  return value.replace(/[<>]/g, "").replace(/\u0000/g, "").trim().slice(0, maxLength);
}

export function sanitizeEmail(value: unknown): string {
  return sanitizeText(value, 254).toLowerCase();
}

export function escapeHtml(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}