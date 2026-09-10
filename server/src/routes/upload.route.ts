// backend/src/routes/upload.route.ts
import type { FastifyInstance } from "fastify";
import type { Readable } from "node:stream";
import { authenticate } from "../middleware/auth.js";
import { uploadAsset } from "../storage/supabase.js";
import { uploadKindSchema } from "../schemas/index.js";
import { badRequest, forbidden } from "../lib/errors.js";
import { audit } from "../middleware/audit.js";

export default async function uploadRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // Uploads are heavier than normal calls, so they carry a tighter budget.
  // Streamed straight to Supabase — never local disk, never a DB blob.
  app.post<{ Params: { kind: string } }>("/:kind", {
    config: { rateLimit: { max: 15, timeWindow: "5 minutes" } },
  }, async (req) => {
    const { kind } = uploadKindSchema.parse(req.params);
    if (kind === "menu-items" && req.auth!.role !== "super_admin") throw forbidden();

    const file = await req.file();
    if (!file) throw badRequest("VALIDATION_ERROR");

    const result = await uploadAsset({
      kind,
      stream: file.file as unknown as Readable,
      ownerEntity: kind,
      ownerId: req.auth!.userId,
    });

    await audit(req, {
      action: "storage.uploaded", entity: "storage_objects", entityId: result.path,
      after: { bytes: result.bytes, mime: result.mime },
    });
    return { success: true, data: result }; // only the object PATH crosses the wire
  });
}