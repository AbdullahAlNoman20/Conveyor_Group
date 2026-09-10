// backend/src/routes/backup.route.ts
import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { backupQuery } from "../schemas/index.js";
import { buildBackup, buildTransactionCsvRows, toCsv } from "../services/backup.service.js";
import { audit } from "../middleware/audit.js";

export default async function backupRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireRole("super_admin"));

  app.get("/", { config: { rateLimit: { max: 6, timeWindow: "5 minutes" } } }, async (req, reply) => {
    const q = backupQuery.parse(req.query);
    await audit(req, { action: "backup.exported", entity: "system", after: q });

    if (q.format === "csv") {
      const { label, rows } = await buildTransactionCsvRows(q.kind);
      return reply
        .header("content-type", "text/csv; charset=utf-8")
        .header("content-disposition", `attachment; filename="cccms-${q.kind}-transactions-${label}.csv"`)
        .send(toCsv(rows));
    }

    const { label, payload } = await buildBackup(q.kind);
    return reply
      .header("content-type", "application/json; charset=utf-8")
      .header("content-disposition", `attachment; filename="cccms-${q.kind}-backup-${label}.json"`)
      .send(payload);
  });
}