// backend/src/lib/ids.ts
import { randomBytes, randomUUID } from "node:crypto";

// Same shapes as the old utils/idGenerator.js so existing IDs stay valid.
export function genId(prefix = "ID"): string {
  const rand = randomBytes(4).toString("hex").slice(0, 5).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export const uuid = () => randomUUID();
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export function formatSequentialId(prefix: string, next: number): string {
  return `${prefix}${String(next).padStart(2, "0")}`;
}

// Readable temp password — no 0/O/1/l/I so it can be read aloud over a phone.
export function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const symbols = "!@#$%";
  const buf = randomBytes(length + 1);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[buf[i]! % chars.length];
  return out + symbols[buf[length]! % symbols.length];
}

export function deriveEmail(name: string, domain = "conveyorgroup.com"): string {
  const slug = name.toLowerCase().trim()
    .replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean).join(".");
  return `${slug || "user"}@${domain}`;
}