// backend/src/middleware/audit.ts
import type { FastifyRequest } from "fastify";
import { db } from "../db/index.js";
import { auditLogs } from "../db/schema.js";
import { genId } from "../lib/ids.js";
import { logger } from "../lib/logger.js";

export interface AuditInput {
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

const SENSITIVE = new Set(["passwordHash", "password_hash", "password", "tokenHash", "qrToken", "qr_token"]);

function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE.has(k) ? "[REDACTED]" : scrub(v);
    }
    return out;
  }
  return value;
}

// Append-only. Never throws into the request path.
export async function audit(req: FastifyRequest | null, input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: genId("AUD"),
      actorId: req?.auth?.userId ?? null,
      actorRole: req?.auth?.role ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      before: (scrub(input.before) ?? null) as never,
      after: (scrub(input.after) ?? null) as never,
      ip: req?.ip ?? null,
      userAgent: (req?.headers["user-agent"] as string | undefined) ?? null,
      requestId: (req?.id as string | undefined) ?? null,
    });
  } catch (err) {
    logger.error({ err, action: input.action }, "audit write failed");
  }
}