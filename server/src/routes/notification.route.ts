// backend/src/routes/notification.route.ts
import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { listForUser, markAllRead, markRead } from "../services/notification.service.js";

export default async function notificationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/", async (req) => {
    const items = await listForUser(req.auth!.userId, req.auth!.role);
    return { success: true, data: { items, unreadCount: items.filter((i) => !i.read).length } };
  });

  app.post("/read-all", async (req) => {
    await markAllRead(req.auth!.userId, req.auth!.role);
    return { success: true, data: { ok: true } };
  });

  app.post<{ Params: { id: string } }>("/:id/read", async (req) => {
    await markRead(req.params.id, req.auth!.userId);
    return { success: true, data: { ok: true } };
  });
}