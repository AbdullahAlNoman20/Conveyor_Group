// backend/src/routes/accountRequest.route.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { paged, paginationSchema } from "../lib/pagination.js";
import { rejectRequestSchema } from "../schemas/index.js";
import * as service from "../services/accountRequest.service.js";
import { welcomeEmailQueue } from "../jobs/queue.js";
import { audit } from "../middleware/audit.js";

export default async function accountRequestRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireRole("super_admin"));

  app.get("/", async (req) => {
    const q = paginationSchema
      .extend({ status: z.enum(["pending", "approved", "rejected"]).optional() })
      .parse(req.query);
    const { items, total } = await service.listRequests(q);
    return { success: true, data: paged(items, total, q) };
  });

  app.post("/send-welcome", { config: { rateLimit: { max: 20, timeWindow: "5 minutes" } } }, async (req) => {
    const body = z.object({
      email: z.email(), name: z.string().max(100), role: z.string().max(60).optional(),
    }).parse(req.body);
    await welcomeEmailQueue.add("send", body);
    await audit(req, { action: "welcome_email.queued", entity: "users", after: { email: body.email } });
    return { success: true, data: { queued: true } };
  });

  app.get<{ Params: { id: string } }>("/:id",
    async (req) => ({ success: true, data: await service.getRequest(req.params.id) }));

  app.post<{ Params: { id: string } }>("/:id/approve", async (req) => {
    const result = await service.approve(req.params.id, req.auth!.userId);
    await audit(req, {
      action: "account_request.approved", entity: "account_requests",
      entityId: req.params.id, before: result.request,
    });
    return { success: true, data: { credentials: result.credentials } };
  });

  app.post<{ Params: { id: string } }>("/:id/reject", async (req) => {
    const body = rejectRequestSchema.parse(req.body);
    const row = await service.reject(req.params.id, body.reason, req.auth!.userId);
    await audit(req, { action: "account_request.rejected", entity: "account_requests", entityId: req.params.id, after: row });
    return { success: true, data: { status: row.status } };
  });
}