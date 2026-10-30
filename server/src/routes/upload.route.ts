// server/src/routes/upload.route.ts  (full replace)
import type { FastifyInstance } from "fastify";
import type { Readable } from "node:stream";
import { optionalAuth } from "../middleware/auth.js";
import { can } from "../middleware/rbac.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { uploadAsset } from "../storage/index.js";
import { uploadKindSchema } from "../schemas/index.js";
import { badRequest, forbidden } from "../lib/errors.js";
import { audit } from "../middleware/audit.js";

// Registration is public, so an applicant can attach a photo and a document
// before any account exists. Everything else needs a login and the right duty.
const PUBLIC_KINDS = new Set(["avatars", "documents"]);

export default async function uploadRoutes(app: FastifyInstance) {
  app.addHook("preHandler", optionalAuth);

  app.post<{ Params: { kind: string } }>("/:kind", {
    config: {
      rateLimit: {
        max: 15,
        timeWindow: "5 minutes",
        keyGenerator: (req) => req.auth?.userId ?? `anon:${req.ip}`,
      },
    },
  }, async (req) => {
    const { kind } = uploadKindSchema.parse(req.params);

    if (!req.auth && !PUBLIC_KINDS.has(kind)) throw forbidden();
    if (kind === "menu-items" && !(await can(req, PERMISSIONS.MENU_MANAGE))) throw forbidden();
    if (kind === "vouchers" && !(await can(req, PERMISSIONS.KITCHEN_PURCHASE))) throw forbidden();

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
      entity: "uploads",
      entityId: result.path,
      after: { bytes: result.bytes, mime: result.mime, anonymous: !req.auth },
    });

    return { success: true, data: result };
  });
}