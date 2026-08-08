// FILE: src/components/utils/credentials.js  (NEW)
/** Generates a readable-but-random password for a freshly created account.
 * Avoids visually ambiguous characters (0/O, 1/l/I) since this is meant to
 * be read off an "email" and typed back in by a real person. */
export function generatePassword(length = 10) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const symbols = "!@#$%";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  out += symbols[Math.floor(Math.random() * symbols.length)];
  return out;
}

/** Derives a login email from a display name when the creator didn't
 * already supply one, e.g. "Farzana Karim" -> farzana.karim@conveyorgroup.com */
export function deriveEmail(name, domain = "conveyorgroup.com") {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .join(".");
  return `${slug || "user"}@${domain}`;
}