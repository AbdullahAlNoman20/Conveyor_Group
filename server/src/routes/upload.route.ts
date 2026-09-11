// server/src/routes/upload.route.ts
import type { FastifyInstance } from "fastify";
import type { Readable } from "node:stream";
import { optionalAuth } from "../middleware/auth.js";
import { uploadAsset } from "../storage/supabase.js";
import { uploadKindSchema } from "../schemas/index.js";
import { badRequest, forbidden } from "../lib/errors.js";
import { audit } from "../middleware/audit.js";

// Self-registration is a public page, so an applicant must be able to attach a
// photo and a supporting document before any account exists. Those two kinds
// are therefore anonymous-allowed, on a much tighter rate limit; menu photos
// still require a Super Admin.
const PUBLIC_KINDS = new Set(["avatars", "documents"]);

export default async function uploadRoutes(app: FastifyInstance) {
  app.addHook("preHandler", optionalAuth);

  // Uploads are heavier than normal calls, so they carry their own budget.
  // Streamed straight to Supabase — never local disk, never a DB blob.
  app.post<{ Params: { kind: string } }>("/:kind", {
    config: {
      rateLimit: {
        max: 15,
        timeWindow: "5 minutes",
        // Anonymous callers get a much smaller allowance.
        keyGenerator: (req) => req.auth?.userId ?? `anon:${req.ip}`,
      },
    },
  }, async (req) => {
    const { kind } = uploadKindSchema.parse(req.params);

    if (kind === "menu-items" && req.auth?.role !== "super_admin") throw forbidden();
    if (!req.auth && !PUBLIC_KINDS.has(kind)) throw forbidden();

    const file = await req.file();
    if (!file) throw badRequest("VALIDATION_ERROR");

    const result = await uploadAsset({
      kind,
      stream: file.file as unknown as Readable,
      ownerEntity: kind,
      ownerId: req.auth?.userId ?? null,
    });

    await audit(req, {
      action: "storage.uploaded",
      entity: "storage_objects",
      entityId: result.path,
      after: { bytes: result.bytes, mime: result.mime, anonymous: !req.auth },
    });

    return { success: true, data: result }; // only the object PATH crosses the wire
  });
}