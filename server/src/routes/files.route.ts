// server/src/routes/files.route.ts  (NEW)
import type { FastifyInstance } from "fastify";
import { openAsset, verifySignedPath } from "../storage/index.js";
import { notFound } from "../lib/errors.js";

/**
 * Streams an uploaded file when the link's signature is valid.
 * No login needed: the signed link itself is the permission, which is what
 * lets <img> tags and downloads work without extra headers.
 */
export default async function fileRoutes(app: FastifyInstance) {
  app.get<{ Params: { "*": string }; Querystring: { e?: string; s?: string } }>(
    "/*",
    { config: { rateLimit: { max: 600, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const rel = req.params["*"];
      if (!verifySignedPath(rel, req.query.e, req.query.s)) throw notFound();

      const file = await openAsset(rel);
      if (!file) throw notFound();

      const name = rel.split("/").pop() ?? "file";
      reply
        .header("Content-Type", file.mime)
        .header("Content-Length", String(file.size))
        .header("Cache-Control", "private, max-age=3600")
        .header("X-Content-Type-Options", "nosniff")
        .header("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'")
        .header("Cross-Origin-Resource-Policy", "same-site")
        .header("Content-Disposition", `inline; filename="${name}"`);

      return reply.send(file.stream);
    },
  );
}