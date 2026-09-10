// backend/src/routes/client.route.ts
import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  clientActionSchema, clientListQuery, createClientSchema,
  updateClientSchema, updateOwnProfileSchema,
} from "../schemas/index.js";
import * as clientService from "../services/client.service.js";
import { resetPasswordFor } from "../services/auth.service.js";
import { clientSpend, statement } from "../services/report.service.js";
import { paged } from "../lib/pagination.js";
import { audit } from "../middleware/audit.js";
import { deriveEmail } from "../lib/ids.js";
import { notFound } from "../lib/errors.js";

export default async function clientRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  /* self-service (client) */
  app.get("/me", { preHandler: [requireRole("client")] }, async (req) => {
    const row = await clientService.getOwnClient(req.auth!.userId);
    return { success: true, data: await clientService.toPublicClient(row) };
  });

  app.patch("/me", { preHandler: [requireRole("client")] }, async (req) => {
    const body = updateOwnProfileSchema.parse(req.body);
    const row = await clientService.getOwnClient(req.auth!.userId);
    const { before, after } = await clientService.updateClient(row.id, body);
    await audit(req, { action: "client.self_update", entity: "clients", entityId: row.id, before, after });
    return { success: true, data: await clientService.toPublicClient(after) };
  });

  app.get("/me/spend", { preHandler: [requireRole("client")] }, async (req) => {
    const row = await clientService.getOwnClient(req.auth!.userId);
    return { success: true, data: await clientSpend(row.id) };
  });

  app.get<{ Querystring: { year: string; month: string } }>("/me/statement", {
    preHandler: [requireRole("client")],
  }, async (req) => {
    const row = await clientService.getOwnClient(req.auth!.userId);
    return { success: true, data: await statement(row.id, Number(req.query.year), Number(req.query.month)) };
  });

  /* staff-facing */
  app.get("/", { preHandler: [requireRole("super_admin", "manager")] }, async (req) => {
    const q = clientListQuery.parse(req.query);
    const { items, total } = await clientService.listClients(q);
    return { success: true, data: paged(items, total, q) };
  });

  app.get<{ Params: { id: string } }>("/:id", {
    preHandler: [requireRole("super_admin", "manager")],
  }, async (req) => ({ success: true, data: await clientService.getClient(req.params.id) }));

  app.get<{ Params: { id: string }; Querystring: { year: string; month: string } }>("/:id/statement", {
    preHandler: [requireRole("super_admin", "manager")],
  }, async (req) => ({
    success: true, data: await statement(req.params.id, Number(req.query.year), Number(req.query.month)),
  }));

  app.post("/", { preHandler: [requireRole("super_admin")] }, async (req) => {
    const body = createClientSchema.parse(req.body);
    const created = await clientService.createClientWithLogin(body as never);
    await audit(req, { action: "client.created", entity: "clients", entityId: created.client.id, after: created.client });
    // The password is returned exactly once, for the WelcomeEmailPage preview.
    return {
      success: true,
      data: {
        client: await clientService.getClient(created.client.id),
        credentials: {
          name: created.client.name,
          email: created.email,
          password: created.password,
          role: "Client (Fixed Company Meal)",
          userId: created.userId,
          qrToken: created.client.id,
        },
      },
    };
  });

  app.patch<{ Params: { id: string } }>("/:id", { preHandler: [requireRole("super_admin")] }, async (req) => {
    const body = updateClientSchema.parse(req.body);
    const { before, after } = await clientService.updateClient(req.params.id, body);
    await audit(req, { action: "client.updated", entity: "clients", entityId: req.params.id, before, after });
    return { success: true, data: await clientService.getClient(after.id) };
  });

  app.post<{ Params: { id: string } }>("/:id/actions", {
    preHandler: [requireRole("super_admin")],
  }, async (req) => {
    const { action } = clientActionSchema.parse(req.body);

    if (action === "reset-password") {
      const client = await clientService.getClient(req.params.id);
      if (!client.userId) throw notFound("CLIENT_NOT_FOUND");
      const password = await resetPasswordFor(client.userId);
      await audit(req, { action: "client.password_reset", entity: "clients", entityId: req.params.id });
      return {
        success: true,
        data: {
          credentials: {
            name: client.name,
            email: client.email || deriveEmail(client.name),
            password,
            role: "Client (Fixed Company Meal)",
            userId: client.userId,
          },
        },
      };
    }

    const { before, after } = await clientService.runLifecycleAction(req.params.id, action);
    await audit(req, { action: `client.${action}`, entity: "clients", entityId: req.params.id, before, after });
    return { success: true, data: await clientService.getClient(after.id) };
  });

  app.get("/meta/departments", {
    preHandler: [requireRole("super_admin", "manager")],
  }, async () => ({ success: true, data: await clientService.departments() }));
}