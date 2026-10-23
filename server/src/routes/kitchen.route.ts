// server/src/routes/kitchen.route.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { PERMISSIONS } from "../constants/permissions.js";
import {
  consumptionSchema,
  costRangeSchema,
  inventoryItemPatchSchema,
  inventoryItemSchema,
  purchaseSchema,
  shoppingListSchema,
  stockAdjustSchema,
} from "../schemas/index.js";
import * as kitchen from "../services/kitchen.service.js";
import { audit } from "../middleware/audit.js";

const dateQuery = z.object({ date: z.iso.date().optional() });

/**
 * Procurement is the Manager's job; the Super Admin sees everything for
 * oversight but doesn't run the kitchen day to day.
 */
export default async function kitchenRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  // Anyone holding any kitchen permission may reach the module; each write is
  // then gated on the specific duty below.
  app.addHook("preHandler", requirePermission(
    PERMISSIONS.KITCHEN_SHOPPING,
    PERMISSIONS.KITCHEN_PURCHASE,
    PERMISSIONS.KITCHEN_INVENTORY,
    PERMISSIONS.KITCHEN_COST_VIEW,
  ));

  const canShop = requirePermission(PERMISSIONS.KITCHEN_SHOPPING);
  const canPurchase = requirePermission(PERMISSIONS.KITCHEN_PURCHASE);
  const canStock = requirePermission(PERMISSIONS.KITCHEN_INVENTORY);
  const canCost = requirePermission(PERMISSIONS.KITCHEN_COST_VIEW);

  /* ── catalogue & stock ─────────────────────────────────────────────── */
  app.get("/items", async (req) => {
    const { all } = z.object({ all: z.coerce.boolean().default(false) }).parse(req.query);
    return { success: true, data: await kitchen.listItems(all) };
  });

  app.post("/items", { preHandler: [canStock] }, async (req) => {
    const body = inventoryItemSchema.parse(req.body);
    const row = await kitchen.upsertItem(body);
    await audit(req, { action: "inventory.item_created", entity: "inventory_items", entityId: row.id, after: row });
    return { success: true, data: row };
  });

  app.patch<{ Params: { id: string } }>("/items/:id", { preHandler: [canStock] }, async (req) => {
    const body = inventoryItemPatchSchema.parse(req.body);
    const { before, after } = await kitchen.patchItem(req.params.id, body);
    await audit(req, { action: "inventory.item_updated", entity: "inventory_items", entityId: req.params.id, before, after });
    return { success: true, data: after };
  });

  app.post<{ Params: { id: string } }>("/items/:id/adjust", { preHandler: [canStock] }, async (req) => {
    const body = stockAdjustSchema.parse(req.body);
    const items = await kitchen.adjustStock({ itemId: req.params.id, ...body, userId: req.auth!.userId });
    await audit(req, { action: "inventory.adjusted", entity: "inventory_items", entityId: req.params.id, after: body });
    return { success: true, data: items };
  });

  app.get<{ Params: { id: string } }>("/items/:id/history",
    async (req) => ({ success: true, data: await kitchen.itemHistory(req.params.id) }));

  /* ── shopping lists ────────────────────────────────────────────────── */
  app.get("/lists", async () => ({ success: true, data: await kitchen.listShoppingLists() }));

  // Pre-fills a new list from the dish planned for that day.
  app.get("/lists/suggest", { preHandler: [canShop] }, async (req) => {
    const { date } = z.object({ date: z.iso.date() }).parse(req.query);
    return { success: true, data: await kitchen.suggestForDate(date) };
  });

  app.get<{ Params: { id: string } }>("/lists/:id",
    async (req) => ({ success: true, data: await kitchen.getShoppingList(req.params.id) }));

  app.post("/lists", { preHandler: [canShop] }, async (req) => {
    const body = shoppingListSchema.parse(req.body);
    const list = await kitchen.saveShoppingList({ ...body, userId: req.auth!.userId });
    await audit(req, { action: "shopping_list.saved", entity: "shopping_lists", entityId: list.id });
    return { success: true, data: list };
  });

  app.put<{ Params: { id: string } }>("/lists/:id", { preHandler: [canShop] }, async (req) => {
    const body = shoppingListSchema.parse(req.body);
    const list = await kitchen.saveShoppingList({ ...body, id: req.params.id, userId: req.auth!.userId });
    await audit(req, { action: "shopping_list.updated", entity: "shopping_lists", entityId: req.params.id });
    return { success: true, data: list };
  });

  app.delete<{ Params: { id: string } }>("/lists/:id", { preHandler: [canShop] }, async (req) => {
    await kitchen.deleteShoppingList(req.params.id);
    await audit(req, { action: "shopping_list.deleted", entity: "shopping_lists", entityId: req.params.id });
    return { success: true, data: { deleted: true } };
  });

  /* ── purchases ─────────────────────────────────────────────────────── */
  app.get("/purchases", async () => ({ success: true, data: await kitchen.listPurchases() }));

  app.get<{ Params: { id: string } }>("/purchases/:id",
    async (req) => ({ success: true, data: await kitchen.getPurchase(req.params.id) }));

  app.post("/purchases", { preHandler: [canPurchase] }, async (req) => {
    const body = purchaseSchema.parse(req.body);
    const result = await kitchen.recordPurchase({ ...body, userId: req.auth!.userId });
    await audit(req, { action: "purchase.recorded", entity: "purchases", entityId: result.id, after: result });
    return { success: true, data: result };
  });

  /* ── daily usage ───────────────────────────────────────────────────── */
  app.get("/consumption", async (req) => {
    const { date } = dateQuery.parse(req.query);
    return { success: true, data: await kitchen.listConsumption(date ?? new Date().toISOString().slice(0, 10)) };
  });

  app.post("/consumption", { preHandler: [canStock] }, async (req) => {
    const body = consumptionSchema.parse(req.body);
    const result = await kitchen.recordConsumption({ ...body, userId: req.auth!.userId });
    await audit(req, { action: "consumption.recorded", entity: "consumptions", after: { date: body.usedDate, ...result } });
    return { success: true, data: result };
  });

  app.delete<{ Params: { id: string } }>("/consumption/:id", { preHandler: [canStock] }, async (req) => {
    await kitchen.deleteConsumption(req.params.id, req.auth!.userId);
    await audit(req, { action: "consumption.reversed", entity: "consumptions", entityId: req.params.id });
    return { success: true, data: { deleted: true } };
  });

  /* ── cost analysis ─────────────────────────────────────────────────── */
  app.get("/costs/daily", { preHandler: [canCost] }, async (req) => {
    const { date } = dateQuery.parse(req.query);
    return { success: true, data: await kitchen.dailyCost(date) };
  });

  app.get("/costs/monthly", { preHandler: [canCost] }, async (req) => {
    const q = costRangeSchema.parse(req.query);
    return { success: true, data: await kitchen.monthlyCost(q.year, q.month) };
  });
}