const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s]{7,15}$/;

export function validateLoginForm({ email, password }) {
  const errors = {};
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";

  if (!password) errors.password = "Password is required.";
  else if (password.length < 6) errors.password = "Password must be at least 6 characters.";

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateRequired(fields, values) {
  const errors = {};
  for (const key of fields) {
    const v = values[key];
    if (v === undefined || v === null || String(v).trim() === "") {
      errors[key] = "This field is required.";
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validatePhone(value) {
  return PHONE_RE.test(String(value || "").trim());
}

export function validateEmail(value) {
  return EMAIL_RE.test(String(value || "").trim());
}

/** Guards against a client ordering their Fixed Meal twice on the same day
 * (SRS Section 7.2.2 / 9.4 — Daily Meal Restriction). */
export function hasAlreadyCollectedToday(orders, clientId, todayISO) {
  return orders.some(
    (o) => o.clientId === clientId && o.date === todayISO && o.status !== "cancelled"
  );
}
