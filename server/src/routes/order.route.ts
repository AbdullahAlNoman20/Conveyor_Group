// backend/src/routes/order.route.ts
import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { instantOrderSchema, orderListQuery, orderStatusSchema, placeOrderSchema } from "../schemas/index.js";
import * as orderService from "../services/order.service.js";
import { orderRepo } from "../repositories/order.repo.js";
import { getOwnClient } from "../services/client.service.js";
import { verifyStationCode } from "../services/qr.service.js";
import { paged } from "../lib/pagination.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { audit } from "../middleware/audit.js";

export default async function orderRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/", async (req) => {
    const q = orderListQuery.parse(req.query);
    const statuses = q.status?.split(",").map((s) => s.trim()).filter(Boolean);

    let clientId = q.clientId;
    // A client can only ever list their own orders, whatever they ask for.
    if (req.auth!.role === "client") clientId = (await getOwnClient(req.auth!.userId)).id;

    const { rows, total } = await orderRepo.list({ ...q, statuses, clientId });
    return { success: true, data: paged(await orderService.hydrateOrders(rows), total, q) };
  });

  app.get("/meta/todays-fixed-meal",
    async () => ({ success: true, data: await orderService.todaysFixedMeal() }));

  app.get("/board/queue", async () => ({ success: true, data: await orderService.boardQueue() }));

  app.get<{ Params: { id: string } }>("/:id", async (req) => {
    const row = await orderRepo.byId(req.params.id);
    if (!row) throw notFound("ORDER_NOT_FOUND");
    // Ownership check the frontend never performed.
    if (req.auth!.role === "client") {
      const me = await getOwnClient(req.auth!.userId);
      if (row.clientId !== me.id) throw forbidden();
    }
    const [hydrated] = await orderService.hydrateOrders([row]);
    return { success: true, data: hydrated };
  });

  app.post("/", {
    preHandler: [requireRole("client")],
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  }, async (req) => {
    const body = placeOrderSchema.parse(req.body);
    const client = await getOwnClient(req.auth!.userId);
    const order = await orderService.placeOrder({
      client,
      placedByUserId: req.auth!.userId,
      collectionType: body.collectionType,
      tableNumber: body.tableNumber ?? null,
    });
    await audit(req, { action: "order.placed", entity: "orders", entityId: order.id, after: order });
    const [hydrated] = await orderService.hydrateOrders([order]);
    return { success: true, data: hydrated };
  });

  app.post("/instant", {
    preHandler: [requireRole("client", "manager")],
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  }, async (req) => {
    const body = instantOrderSchema.parse(req.body);

    let clientId: string;
    if (body.source === "self_scan") {
      if (req.auth!.role !== "client") throw forbidden();
      await verifyStationCode(body.stationCode);
      clientId = (await getOwnClient(req.auth!.userId)).id;
    } else {
      if (req.auth!.role !== "manager") throw forbidden();
      if (!body.clientId) throw badRequest("VALIDATION_ERROR");
      clientId = body.clientId;
    }

    const order = await orderService.createInstantFixedMealOrder({
      clientId, source: body.source, placedByUserId: req.auth!.userId,
    });
    await audit(req, { action: `order.instant.${body.source}`, entity: "orders", entityId: order.id, after: order });
    const [hydrated] = await orderService.hydrateOrders([order]);
    return { success: true, data: hydrated };
  });

  app.patch<{ Params: { id: string } }>("/:id/status", {
    preHandler: [requireRole("manager", "super_admin")],
  }, async (req) => {
    const body = orderStatusSchema.parse(req.body);
    const before = await orderRepo.byId(req.params.id);
    const after = await orderService.changeStatus(req.params.id, body.status);
    await audit(req, { action: "order.status_changed", entity: "orders", entityId: req.params.id, before, after });
    const [hydrated] = await orderService.hydrateOrders([after]);
    return { success: true, data: hydrated };
  });
}