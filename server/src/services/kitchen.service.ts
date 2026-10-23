// server/src/services/kitchen.service.ts
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  consumptions,
  inventoryItems,
  inventoryMovements,
  purchaseItems,
  purchases,
  shoppingListItems,
  shoppingLists,
} from "../db/schema.js";
import { genId } from "../lib/ids.js";
import { businessDate } from "../lib/clock.js";
import { convertQty } from "../lib/units.js";
import { AppError, conflict, notFound } from "../lib/errors.js";
import { escapeHtml, sanitizeText } from "../lib/sanitize.js";
import { markOrphan, signedUrl } from "../storage/supabase.js";
import { emitCollectionChanged } from "../sockets/index.js";

const n = (v: unknown) => Number(v ?? 0);

/* ─────────────────────────── Catalogue & stock ─────────────────────────── */

export async function listItems(includeInactive = false) {
  const rows = await db
    .select()
    .from(inventoryItems)
    .where(includeInactive ? sql`true` : eq(inventoryItems.active, true))
    .orderBy(inventoryItems.name);

  return rows.map((i) => ({
    id: i.id,
    name: escapeHtml(i.name),
    unit: i.unit,
    currentQty: n(i.currentQty),
    avgUnitCost: n(i.avgUnitCost),
    stockValue: Math.round(n(i.currentQty) * n(i.avgUnitCost)),
    lowStockQty: n(i.lowStockQty),
    lowStock: n(i.lowStockQty) > 0 && n(i.currentQty) <= n(i.lowStockQty),
    active: i.active,
  }));
}

/**
 * Creates a catalogue entry, or returns the existing one. Picking "Other" and
 * typing a name calls this, which is what makes the item appear in the
 * dropdown from the next list onwards.
 */
export async function upsertItem(input: {
  name: string;
  unit?: string;
  lowStockQty?: number;
}) {
  const name = sanitizeText(input.name, 80);
  if (!name) throw new AppError("VALIDATION_ERROR", 422, {}, "Item name is required.");

  const existing = await db.query.inventoryItems.findFirst({
    where: sql`lower(${inventoryItems.name}) = ${name.toLowerCase()}`,
  });

  if (existing) {
    // Re-adding a previously removed item brings it back rather than failing.
    if (!existing.active) {
      await db.update(inventoryItems)
        .set({ active: true, updatedAt: new Date() })
        .where(eq(inventoryItems.id, existing.id));
    }
    return existing;
  }

  const [row] = await db.insert(inventoryItems).values({
    id: genId("ITM"),
    name,
    unit: input.unit ?? "kg",
    lowStockQty: String(input.lowStockQty ?? 0),
  }).returning();

  emitCollectionChanged("inventory", ["manager", "super_admin"]);
  return row!;
}

export async function patchItem(id: string, patch: {
  name?: string;
  unit?: string;
  lowStockQty?: number;
  active?: boolean;
}) {
  const before = await db.query.inventoryItems.findFirst({ where: eq(inventoryItems.id, id) });
  if (!before) throw notFound();

  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) {
    const name = sanitizeText(patch.name, 80);
    const clash = await db.query.inventoryItems.findFirst({
      where: and(
        sql`lower(${inventoryItems.name}) = ${name.toLowerCase()}`,
        sql`${inventoryItems.id} <> ${id}`,
      ),
    });
    if (clash) throw conflict("VALIDATION_ERROR", { message: "Another item already uses that name." });
    values.name = name;
  }
  if (patch.unit !== undefined) values.unit = patch.unit;
  if (patch.lowStockQty !== undefined) values.lowStockQty = String(patch.lowStockQty);
  if (patch.active !== undefined) values.active = patch.active;

  const [after] = await db.update(inventoryItems).set(values).where(eq(inventoryItems.id, id)).returning();
  emitCollectionChanged("inventory", ["manager", "super_admin"]);
  return { before, after: after! };
}

/**
 * Manual stock correction — a recount, spoilage, or an opening balance.
 * `newQty` is the figure the Manager counted, not a delta, because that is
 * what they actually have in front of them.
 */
export async function adjustStock(input: {
  itemId: string;
  newQty: number;
  unitCost?: number;
  note?: string;
  userId: string;
}) {
  const item = await db.query.inventoryItems.findFirst({ where: eq(inventoryItems.id, input.itemId) });
  if (!item) throw notFound();

  const delta = input.newQty - n(item.currentQty);
  const unitCost = input.unitCost ?? n(item.avgUnitCost);

  await db.transaction(async (tx) => {
    await tx.update(inventoryItems).set({
      currentQty: String(input.newQty),
      // An opening balance needs a cost or every later consumption values at 0.
      ...(input.unitCost !== undefined ? { avgUnitCost: String(input.unitCost) } : {}),
      updatedAt: new Date(),
    }).where(eq(inventoryItems.id, input.itemId));

    await tx.insert(inventoryMovements).values({
      id: genId("MOV"),
      itemId: input.itemId,
      movedDate: businessDate(),
      kind: n(item.currentQty) === 0 && delta > 0 ? "opening" : "adjustment",
      qtyDelta: String(delta),
      unitCost: String(unitCost),
      balanceQty: String(input.newQty),
      note: sanitizeText(input.note, 200) || null,
      createdBy: input.userId,
    });
  });

  emitCollectionChanged("inventory", ["manager", "super_admin"]);
  return listItems();
}

export async function itemHistory(itemId: string, limit = 50) {
  const rows = await db.select().from(inventoryMovements)
    .where(eq(inventoryMovements.itemId, itemId))
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(limit);

  return rows.map((m) => ({
    id: m.id,
    date: m.movedDate,
    kind: m.kind,
    qtyDelta: n(m.qtyDelta),
    unitCost: n(m.unitCost),
    balanceQty: n(m.balanceQty),
    note: escapeHtml(m.note ?? ""),
    createdAt: m.createdAt.toISOString(),
  }));
}

/* ───────────────────────────── Shopping lists ───────────────────────────── */

export async function listShoppingLists(limit = 30) {
  const rows = await db.execute<{
    id: string; for_date: string; status: string; notes: string | null;
    item_count: number; created_at: string;
  }>(sql`
    SELECT l.id, l.for_date::text AS for_date, l.status, l.notes,
           count(li.id)::int AS item_count, l.created_at
    FROM shopping_lists l
    LEFT JOIN shopping_list_items li ON li.list_id = l.id
    GROUP BY l.id
    ORDER BY l.for_date DESC, l.created_at DESC
    LIMIT ${limit}
  `);

  return rows.map((r) => ({
    id: r.id,
    forDate: r.for_date,
    status: r.status,
    notes: escapeHtml(r.notes ?? ""),
    itemCount: r.item_count,
    createdAt: r.created_at,
  }));
}

/**
 * What to buy for a given day, taken from the dish on the planner.
 *
 * The planner already records what a dish is made from, so the shopping list
 * starts filled in and only the amounts need typing. Current stock travels
 * with each line so nothing already on the shelf gets bought twice.
 */
export async function suggestForDate(forDate: string) {
  const dayName = new Date(`${forDate}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });

  const [row] = await db.execute<{ meal_name: string; menu_item_id: string | null }>(sql`
    SELECT meal_name, menu_item_id FROM weekly_menu WHERE day = ${dayName}
  `);

  if (!row?.menu_item_id) {
    return { forDate, dayName, mealName: row?.meal_name ?? null, items: [] };
  }

  const items = await db.execute<{
    item_id: string; name: string; unit: string; default_unit: string | null;
    default_qty: string | null; current_qty: string; avg_unit_cost: string;
  }>(sql`
    SELECT mi.item_id, i.name, i.unit, mi.default_qty, mi.default_unit,
           i.current_qty, i.avg_unit_cost
    FROM menu_item_ingredients mi
    JOIN inventory_items i ON i.id = mi.item_id
    WHERE mi.menu_item_id = ${row.menu_item_id} AND i.active = true
    ORDER BY i.name
  `);

  return {
    forDate,
    dayName,
    mealName: escapeHtml(row.meal_name),
    items: items.map((r) => ({
      itemId: r.item_id,
      name: escapeHtml(r.name),
      // The recipe's own unit is carried through, so a line written in grams
      // on the dish stays in grams on the shopping list.
      unit: r.default_unit || r.unit,
      stockUnit: r.unit,
      qty: r.default_qty === null ? "" : String(Number(r.default_qty)),
      inStock: n(r.current_qty),
      avgUnitCost: n(r.avg_unit_cost),
    })),
  };
}

export async function getShoppingList(id: string) {
  const list = await db.query.shoppingLists.findFirst({ where: eq(shoppingLists.id, id) });
  if (!list) throw notFound();

  // Current stock travels with the line so the Manager can see, at the moment
  // of shopping, whether anything actually needs buying.
  const rows = await db.execute<{
    id: number; item_id: string; name: string; unit: string; line_unit: string | null;
    qty: string; note: string | null; current_qty: string; avg_unit_cost: string;
  }>(sql`
    SELECT li.id, li.item_id, i.name, i.unit, li.unit AS line_unit, li.qty, li.note,
           i.current_qty, i.avg_unit_cost
    FROM shopping_list_items li
    JOIN inventory_items i ON i.id = li.item_id
    WHERE li.list_id = ${id}
    ORDER BY i.name
  `);

  return {
    id: list.id,
    forDate: list.forDate,
    status: list.status,
    notes: escapeHtml(list.notes ?? ""),
    items: rows.map((r) => {
      const lineUnit = r.line_unit || r.unit;
      // Stock and the last rate are held in the item's own unit, so the line
      // is converted before the two are compared or multiplied.
      const inBaseUnit = convertQty(n(r.qty), lineUnit, r.unit);
      return {
        id: r.id,
        itemId: r.item_id,
        name: escapeHtml(r.name),
        unit: lineUnit,
        stockUnit: r.unit,
        qty: n(r.qty),
        note: escapeHtml(r.note ?? ""),
        inStock: n(r.current_qty),
        avgUnitCost: n(r.avg_unit_cost),
        estimatedCost: Math.round(inBaseUnit * n(r.avg_unit_cost)),
      };
    }),
  };
}

export async function saveShoppingList(input: {
  id?: string;
  forDate: string;
  notes?: string;
  // The unit travels with the line: a market list may be written in grams for
  // an item the store room counts in kilograms, and the conversion happens
  // when the goods are received rather than here.
  items: { itemId: string; qty: number; unit?: string; note?: string }[];
  userId: string;
}) {
  const id = input.id ?? genId("SL");

  await db.transaction(async (tx) => {
    if (input.id) {
      const existing = await tx.query.shoppingLists.findFirst({ where: eq(shoppingLists.id, id) });
      if (!existing) throw notFound();
      // A purchased list is a record of what was bought; editing it would
      // rewrite history the voucher already attests to.
      if (existing.status === "purchased") {
        throw conflict("VALIDATION_ERROR", { message: "This list has already been purchased." });
      }
      await tx.update(shoppingLists).set({
        forDate: input.forDate,
        notes: sanitizeText(input.notes, 300) || null,
        updatedAt: new Date(),
      }).where(eq(shoppingLists.id, id));
      await tx.delete(shoppingListItems).where(eq(shoppingListItems.listId, id));
    } else {
      await tx.insert(shoppingLists).values({
        id,
        forDate: input.forDate,
        notes: sanitizeText(input.notes, 300) || null,
        createdBy: input.userId,
      });
    }

    if (input.items.length) {
      await tx.insert(shoppingListItems).values(
        input.items.map((it) => ({
          listId: id,
          itemId: it.itemId,
          qty: String(it.qty),
          unit: it.unit || null,
          note: sanitizeText(it.note, 120) || null,
        })),
      );
    }
  });

  emitCollectionChanged("shoppingLists", ["manager", "super_admin"]);
  return getShoppingList(id);
}

export async function deleteShoppingList(id: string) {
  const list = await db.query.shoppingLists.findFirst({ where: eq(shoppingLists.id, id) });
  if (!list) throw notFound();
  if (list.status === "purchased") {
    throw conflict("VALIDATION_ERROR", { message: "A purchased list can't be deleted." });
  }
  await db.delete(shoppingLists).where(eq(shoppingLists.id, id));
  emitCollectionChanged("shoppingLists", ["manager", "super_admin"]);
}

/* ─────────────────────────────── Purchases ─────────────────────────────── */

/**
 * Records a voucher and moves the goods into stock.
 *
 * Each line reblends the item's moving average:
 *   new avg = (oldQty * oldAvg + newQty * newUnitCost) / (oldQty + newQty)
 *
 * The total is derived from the lines rather than typed, so the voucher total
 * and the stock valuation can never disagree.
 */
export async function recordPurchase(input: {
  listId?: string;
  purchaseDate: string;
  voucherPath?: string;
  notes?: string;
  transportCost?: number;
  otherCost?: number;
  otherCostLabel?: string;
  items: { itemId: string; qty: number; unit?: string; lineCost: number }[];
  userId: string;
}) {
  if (!input.items.length) {
    throw new AppError("VALIDATION_ERROR", 422, {}, "Add at least one purchased item.");
  }

  const id = genId("PUR");
  const goodsCost = input.items.reduce((s, it) => s + it.lineCost, 0);
  const transportCost = input.transportCost ?? 0;
  const otherCost = input.otherCost ?? 0;
  const extraCost = transportCost + otherCost;
  const totalCost = goodsCost + extraCost;

  await db.transaction(async (tx) => {
    await tx.insert(purchases).values({
      id,
      listId: input.listId ?? null,
      purchaseDate: input.purchaseDate,
      voucherPath: input.voucherPath ?? null,
      goodsCost: String(goodsCost),
      transportCost: String(transportCost),
      otherCost: String(otherCost),
      otherCostLabel: sanitizeText(input.otherCostLabel, 60) || null,
      totalCost: String(totalCost),
      notes: sanitizeText(input.notes, 300) || null,
      createdBy: input.userId,
    });

    for (const line of input.items) {
      const item = await tx.query.inventoryItems.findFirst({
        where: eq(inventoryItems.id, line.itemId),
      });
      if (!item) throw notFound();

      // A line can be written in grams for an item stocked in kilograms, so it
      // is converted before it touches the stock figure.
      const qty = convertQty(line.qty, line.unit || item.unit, item.unit);
      if (qty <= 0) continue;

      // Delivery and other charges are spread across the lines in proportion
      // to their value. Leaving them out would understate what the food really
      // cost, and so understate the cost of a meal.
      const share = goodsCost > 0 ? (line.lineCost / goodsCost) * extraCost : 0;
      const landedCost = line.lineCost + share;

      const oldQty = n(item.currentQty);
      const oldAvg = n(item.avgUnitCost);
      const newQty = oldQty + qty;
      const unitCost = landedCost / qty;
      const newAvg = newQty > 0 ? (oldQty * oldAvg + landedCost) / newQty : unitCost;

      await tx.insert(purchaseItems).values({
        purchaseId: id,
        itemId: line.itemId,
        qty: String(qty),
        unit: item.unit,
        lineCost: String(line.lineCost),
      });

      await tx.update(inventoryItems).set({
        currentQty: String(newQty),
        avgUnitCost: String(newAvg.toFixed(2)),
        updatedAt: new Date(),
      }).where(eq(inventoryItems.id, line.itemId));

      await tx.insert(inventoryMovements).values({
        id: genId("MOV"),
        itemId: line.itemId,
        movedDate: input.purchaseDate,
        kind: "purchase",
        qtyDelta: String(qty),
        unitCost: String(unitCost.toFixed(2)),
        balanceQty: String(newQty),
        refId: id,
        createdBy: input.userId,
      });
    }

    if (input.listId) {
      await tx.update(shoppingLists)
        .set({ status: "purchased", updatedAt: new Date() })
        .where(eq(shoppingLists.id, input.listId));
    }
  });

  emitCollectionChanged("inventory", ["manager", "accounts", "super_admin"]);
  emitCollectionChanged("shoppingLists", ["manager", "accounts", "super_admin"]);
  return { id, goodsCost, transportCost, otherCost, totalCost };
}

export async function listPurchases(opts: { from?: string; to?: string; limit?: number } = {}) {
  const from = opts.from ?? "1970-01-01";
  const to = opts.to ?? "2999-12-31";
  const limit = opts.limit ?? 200;

  const rows = await db.execute<{
    id: string; purchase_date: string; total_cost: string; transport_cost: string;
    goods_cost: string; other_cost: string;
    voucher_path: string | null; notes: string | null; item_count: number;
  }>(sql`
    SELECT p.id, p.purchase_date::text AS purchase_date, p.total_cost, p.transport_cost,
           p.goods_cost, p.other_cost, p.voucher_path, p.notes,
           count(pi.id)::int AS item_count
    FROM purchases p
    LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
    WHERE p.purchase_date BETWEEN ${from} AND ${to}
    GROUP BY p.id
    ORDER BY p.purchase_date DESC, p.created_at DESC
    LIMIT ${limit}
  `);

  const items = await Promise.all(rows.map(async (r) => ({
    id: r.id,
    date: r.purchase_date,
    goodsCost: n(r.goods_cost) || n(r.total_cost),
    totalCost: n(r.total_cost),
    transportCost: n(r.transport_cost),
    otherCost: n(r.other_cost),
    itemCount: r.item_count,
    notes: escapeHtml(r.notes ?? ""),
    voucher: await signedUrl(r.voucher_path),
    voucherIsPdf: Boolean(r.voucher_path && r.voucher_path.toLowerCase().endsWith(".pdf")),
  })));

  // Returned with the list so the screen does not have to add it up itself,
  // and so the total always matches whatever range was asked for.
  return {
    items,
    summary: {
      count: items.length,
      goodsCost: items.reduce((s, p) => s + p.goodsCost, 0),
      transportCost: items.reduce((s, p) => s + p.transportCost, 0),
      otherCost: items.reduce((s, p) => s + p.otherCost, 0),
      totalCost: items.reduce((s, p) => s + p.totalCost, 0),
    },
  };
}

export async function getPurchase(id: string) {
  const row = await db.query.purchases.findFirst({ where: eq(purchases.id, id) });
  if (!row) throw notFound();

  const lines = await db.execute<{
    name: string; unit: string; qty: string; line_cost: string;
  }>(sql`
    SELECT i.name, COALESCE(pi.unit, i.unit) AS unit, pi.qty, pi.line_cost
    FROM purchase_items pi
    JOIN inventory_items i ON i.id = pi.item_id
    WHERE pi.purchase_id = ${id}
    ORDER BY i.name
  `);

  const voucherPath = row.voucherPath;

  return {
    id: row.id,
    date: row.purchaseDate,
    goodsCost: n(row.goodsCost) || n(row.totalCost),
    transportCost: n(row.transportCost),
    otherCost: n(row.otherCost),
    otherCostLabel: escapeHtml(row.otherCostLabel ?? ""),
    totalCost: n(row.totalCost),
    notes: escapeHtml(row.notes ?? ""),
    voucher: await signedUrl(voucherPath),
    // The viewer needs to know whether to show an image or a download link.
    voucherIsPdf: Boolean(voucherPath && voucherPath.toLowerCase().endsWith(".pdf")),
    items: lines.map((l) => ({
      name: escapeHtml(l.name),
      unit: l.unit,
      qty: n(l.qty),
      lineCost: n(l.line_cost),
      unitCost: n(l.qty) > 0 ? Math.round(n(l.line_cost) / n(l.qty)) : 0,
    })),
  };
}

/* ───────────────────────────── Daily usage ───────────────────────────── */

/**
 * Records what the kitchen actually used today and takes it out of stock,
 * valued at the item's moving average. This is the only input to the daily
 * cooking cost — buying rice for five days must not land on one day's meal.
 */
export async function recordConsumption(input: {
  usedDate: string;
  items: { itemId: string; qty: number; note?: string }[];
  userId: string;
}) {
  if (!input.items.length) {
    throw new AppError("VALIDATION_ERROR", 422, {}, "Add at least one item that was used.");
  }

  let totalCost = 0;

  await db.transaction(async (tx) => {
    for (const line of input.items) {
      const item = await tx.query.inventoryItems.findFirst({
        where: eq(inventoryItems.id, line.itemId),
      });
      if (!item) throw notFound();

      const available = n(item.currentQty);
      if (line.qty > available) {
        throw new AppError(
          "VALIDATION_ERROR",
          409,
          { item: item.name, available },
          `Only ${available} ${item.unit} of ${item.name} is in stock.`,
        );
      }

      const unitCost = n(item.avgUnitCost);
      const cost = Math.round(line.qty * unitCost);
      totalCost += cost;
      const balance = available - line.qty;

      await tx.insert(consumptions).values({
        id: genId("CON"),
        usedDate: input.usedDate,
        itemId: line.itemId,
        qty: String(line.qty),
        unitCost: String(unitCost),
        cost: String(cost),
        note: sanitizeText(line.note, 120) || null,
        createdBy: input.userId,
      });

      await tx.update(inventoryItems)
        .set({ currentQty: String(balance), updatedAt: new Date() })
        .where(eq(inventoryItems.id, line.itemId));

      await tx.insert(inventoryMovements).values({
        id: genId("MOV"),
        itemId: line.itemId,
        movedDate: input.usedDate,
        kind: "consumption",
        qtyDelta: String(-line.qty),
        unitCost: String(unitCost),
        balanceQty: String(balance),
        createdBy: input.userId,
      });
    }
  });

  emitCollectionChanged("inventory", ["manager", "super_admin"]);
  return { totalCost };
}

export async function listConsumption(date: string) {
  const rows = await db.execute<{
    id: string; name: string; unit: string; qty: string; unit_cost: string;
    cost: string; note: string | null;
  }>(sql`
    SELECT c.id, i.name, i.unit, c.qty, c.unit_cost, c.cost, c.note
    FROM consumptions c
    JOIN inventory_items i ON i.id = c.item_id
    WHERE c.used_date = ${date}
    ORDER BY i.name
  `);

  const items = rows.map((r) => ({
    id: r.id,
    name: escapeHtml(r.name),
    unit: r.unit,
    qty: n(r.qty),
    unitCost: n(r.unit_cost),
    cost: n(r.cost),
    note: escapeHtml(r.note ?? ""),
  }));

  return { date, items, totalCost: items.reduce((s, i) => s + i.cost, 0) };
}

export async function deleteConsumption(id: string, userId: string) {
  const row = await db.query.consumptions.findFirst({ where: eq(consumptions.id, id) });
  if (!row) throw notFound();

  // Puts the quantity back and leaves a movement, so the correction is visible
  // rather than the original entry silently vanishing.
  await db.transaction(async (tx) => {
    const item = await tx.query.inventoryItems.findFirst({
      where: eq(inventoryItems.id, row.itemId),
    });
    if (!item) throw notFound();

    const balance = n(item.currentQty) + n(row.qty);

    await tx.delete(consumptions).where(eq(consumptions.id, id));
    await tx.update(inventoryItems)
      .set({ currentQty: String(balance), updatedAt: new Date() })
      .where(eq(inventoryItems.id, row.itemId));

    await tx.insert(inventoryMovements).values({
      id: genId("MOV"),
      itemId: row.itemId,
      movedDate: row.usedDate,
      kind: "adjustment",
      qtyDelta: String(n(row.qty)),
      unitCost: String(n(row.unitCost)),
      balanceQty: String(balance),
      note: "Reversed a usage entry",
      createdBy: userId,
    });
  });

  emitCollectionChanged("inventory", ["manager", "super_admin"]);
}

/* ──────────────────────────── Cost analysis ──────────────────────────── */

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * How many people the kitchen cooked for on a given date.
 *
 * After the nightly sweep every non-cancelling employee has an attendance row,
 * so that count is exact. Before it, the figure is derived live from the
 * roster minus cancellations — which is the "30 on the books, 2 on leave, cook
 * for 28" calculation.
 */
async function peopleCookedFor(date: string): Promise<number> {
  const [row] = await db.execute<{ decided: number; cancelled: number; roster: number }>(sql`
    SELECT
      (SELECT count(*)::int FROM meal_attendance
        WHERE date = ${date} AND status IN ('collected','no_show')) AS decided,
      (SELECT count(*)::int FROM meal_attendance
        WHERE date = ${date} AND status = 'cancelled') AS cancelled,
      (SELECT count(*)::int FROM clients
        WHERE status = 'active' AND meal_plan = 'Fixed Company Meal') AS roster
  `);

  if (!row) return 0;
  return row.decided > 0 ? row.decided : Math.max(0, row.roster - row.cancelled);
}

/** The price being charged for that day's dish, from the weekly planner. */
async function menuPriceFor(date: string): Promise<{ name: string | null; price: number }> {
  const dayName = DAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
  const [row] = await db.execute<{ meal_name: string; price: string | null }>(sql`
    SELECT w.meal_name, m.price
    FROM weekly_menu w
    LEFT JOIN menu_items m ON m.id = w.menu_item_id
    WHERE w.day = ${dayName}
  `);
  return { name: row?.meal_name ?? null, price: n(row?.price) };
}

/**
 * Day by day cost across any range, for the cost screen's table.
 *
 * Takes plain dates rather than a year and a month, so one function answers
 * a day, a week, a month or a year and the screen does not have to pick a
 * different endpoint per view.
 */
export async function costInPeriod(from: string, to: string) {
  const [costRows, attendanceRows, purchaseRows, roster] = await Promise.all([
    db.execute<{ d: string; cost: string }>(sql`
      SELECT used_date::text AS d, sum(cost) AS cost
      FROM consumptions WHERE used_date BETWEEN ${from} AND ${to}
      GROUP BY used_date ORDER BY used_date
    `),
    db.execute<{ d: string; decided: number; cancelled: number }>(sql`
      SELECT date::text AS d,
             count(*) FILTER (WHERE status IN ('collected','no_show'))::int AS decided,
             count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
      FROM meal_attendance WHERE date BETWEEN ${from} AND ${to}
      GROUP BY date
    `),
    db.execute<{ d: string; spent: string }>(sql`
      SELECT purchase_date::text AS d, sum(total_cost) AS spent
      FROM purchases WHERE purchase_date BETWEEN ${from} AND ${to}
      GROUP BY purchase_date
    `),
    db.execute<{ c: number }>(sql`
      SELECT count(*)::int AS c FROM clients
      WHERE status = 'active' AND meal_plan = 'Fixed Company Meal'
    `),
  ]);

  const rosterCount = roster[0]?.c ?? 0;
  const attendanceByDate = new Map(attendanceRows.map((r) => [r.d, r]));
  const purchaseByDate = new Map(purchaseRows.map((r) => [r.d, n(r.spent)]));

  const dates = [...new Set([
    ...costRows.map((r) => r.d),
    ...attendanceRows.map((r) => r.d),
  ])].sort();

  const days = await Promise.all(dates.map(async (d) => {
    const cost = n(costRows.find((r) => r.d === d)?.cost);
    const att = attendanceByDate.get(d);
    // Before the nightly sweep nobody has an attendance row yet, so the head
    // count falls back to the roster minus whoever cancelled.
    const people = att && att.decided > 0
      ? att.decided
      : Math.max(0, rosterCount - (att?.cancelled ?? 0));

    const menu = await menuPriceFor(d);
    const costPerMeal = people > 0 ? Math.round(cost / people) : 0;

    return {
      date: d,
      mealName: menu.name,
      people,
      cost,
      purchased: purchaseByDate.get(d) ?? 0,
      costPerMeal,
      chargedPerMeal: menu.price,
      marginPerMeal: menu.price - costPerMeal,
      totalCharged: menu.price * people,
      totalMargin: (menu.price - costPerMeal) * people,
    };
  }));

  const totalCost = days.reduce((s, d) => s + d.cost, 0);
  const totalMeals = days.reduce((s, d) => s + d.people, 0);
  const totalCharged = days.reduce((s, d) => s + d.totalCharged, 0);

  return {
    days,
    summary: {
      daysCooked: days.length,
      totalMeals,
      totalCost,
      totalPurchased: days.reduce((s, d) => s + d.purchased, 0),
      totalCharged,
      totalMargin: totalCharged - totalCost,
      avgCostPerMeal: totalMeals > 0 ? Math.round(totalCost / totalMeals) : 0,
      avgChargedPerMeal: totalMeals > 0 ? Math.round(totalCharged / totalMeals) : 0,
    },
  };
}

/**
 * Profit and loss for each dish over a period.
 *
 * Grouped by the dish rather than the date, because the decision it feeds is
 * a menu decision. A dish that loses money every Tuesday is a pricing problem,
 * not a Tuesday problem.
 */
export async function dishProfitability(from: string, to: string) {
  const rows = await db.execute<{
    meal_name: string; price: string | null; days: number;
    total_cost: string; total_people: number;
  }>(sql`
    WITH day_cost AS (
      SELECT used_date AS d, sum(cost) AS cost
      FROM consumptions WHERE used_date BETWEEN ${from} AND ${to}
      GROUP BY used_date
    ), day_people AS (
      SELECT date AS d, count(*) FILTER (WHERE status IN ('collected','no_show'))::int AS people
      FROM meal_attendance WHERE date BETWEEN ${from} AND ${to}
      GROUP BY date
    ), joined AS (
      SELECT w.meal_name, m.price, c.d, c.cost, COALESCE(p.people, 0) AS people
      FROM day_cost c
      LEFT JOIN day_people p ON p.d = c.d
      LEFT JOIN weekly_menu w ON trim(w.day) = trim(to_char(c.d, 'FMDay'))
      LEFT JOIN menu_items m ON m.id = w.menu_item_id
    )
    SELECT COALESCE(meal_name, 'Not set') AS meal_name,
           max(price) AS price,
           count(*)::int AS days,
           sum(cost) AS total_cost,
           sum(people)::int AS total_people
    FROM joined
    GROUP BY meal_name
    ORDER BY sum(cost) DESC
  `);

  const dishes = rows.map((r) => {
    const people = r.total_people;
    const cost = n(r.total_cost);
    const charged = n(r.price);
    const costPerMeal = people > 0 ? Math.round(cost / people) : 0;

    return {
      name: escapeHtml(r.meal_name.trim()),
      days: r.days,
      people,
      totalCost: cost,
      costPerMeal,
      chargedPerMeal: charged,
      // Rounded up to the next five taka, because nobody prices a meal at 87.
      suggestedPrice: costPerMeal > 0 ? Math.ceil(costPerMeal / 5) * 5 : charged,
      profitPerMeal: charged - costPerMeal,
      totalCharged: charged * people,
      totalProfit: (charged - costPerMeal) * people,
    };
  });

  return {
    dishes,
    summary: {
      totalCost: dishes.reduce((s, d) => s + d.totalCost, 0),
      totalCharged: dishes.reduce((s, d) => s + d.totalCharged, 0),
      totalProfit: dishes.reduce((s, d) => s + d.totalProfit, 0),
      totalMeals: dishes.reduce((s, d) => s + d.people, 0),
      losingDishes: dishes.filter((d) => d.profitPerMeal < 0).length,
    },
  };
}

export async function dailyCost(date = businessDate()) {
  const [usage, people, menu] = await Promise.all([
    listConsumption(date),
    peopleCookedFor(date),
    menuPriceFor(date),
  ]);

  const [spend] = await db.execute<{ purchased: string }>(sql`
    SELECT COALESCE(sum(total_cost), 0) AS purchased
    FROM purchases WHERE purchase_date = ${date}
  `);

  const totalCost = usage.totalCost;
  const costPerMeal = people > 0 ? Math.round(totalCost / people) : 0;
  const chargedPerMeal = menu.price;
  // Positive = the price covers the cost. Negative = the company is subsidising.
  const marginPerMeal = chargedPerMeal - costPerMeal;

  return {
    date,
    mealName: menu.name,
    items: usage.items,
    totalCost,
    // Shown separately: money spent at the market that day, which rarely
    // matches what was actually cooked with.
    purchasedToday: n(spend?.purchased),
    peopleCookedFor: people,
    costPerMeal,
    chargedPerMeal,
    marginPerMeal,
    totalCharged: chargedPerMeal * people,
    totalMargin: (chargedPerMeal - costPerMeal) * people,
  };
}

export async function monthlyCost(year: number, month: number) {
  const from = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);

  // One grouped pass per source, then joined in memory — far cheaper than a
  // correlated subquery per day of the month.
  const [costRows, attendanceRows, purchaseRows, roster] = await Promise.all([
    db.execute<{ d: string; cost: string }>(sql`
      SELECT used_date::text AS d, sum(cost) AS cost
      FROM consumptions WHERE used_date BETWEEN ${from} AND ${to}
      GROUP BY used_date ORDER BY used_date
    `),
    db.execute<{ d: string; decided: number; cancelled: number }>(sql`
      SELECT date::text AS d,
             count(*) FILTER (WHERE status IN ('collected','no_show'))::int AS decided,
             count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
      FROM meal_attendance WHERE date BETWEEN ${from} AND ${to}
      GROUP BY date
    `),
    db.execute<{ d: string; spent: string }>(sql`
      SELECT purchase_date::text AS d, sum(total_cost) AS spent
      FROM purchases WHERE purchase_date BETWEEN ${from} AND ${to}
      GROUP BY purchase_date
    `),
    db.execute<{ c: number }>(sql`
      SELECT count(*)::int AS c FROM clients
      WHERE status = 'active' AND meal_plan = 'Fixed Company Meal'
    `),
  ]);

  const rosterCount = roster[0]?.c ?? 0;
  const attendanceByDate = new Map(attendanceRows.map((r) => [r.d, r]));
  const purchaseByDate = new Map(purchaseRows.map((r) => [r.d, n(r.spent)]));

  const dates = [...new Set([
    ...costRows.map((r) => r.d),
    ...attendanceRows.map((r) => r.d),
  ])].sort();

  const days = await Promise.all(dates.map(async (d) => {
    const cost = n(costRows.find((r) => r.d === d)?.cost);
    const att = attendanceByDate.get(d);
    const people = att && att.decided > 0
      ? att.decided
      : Math.max(0, rosterCount - (att?.cancelled ?? 0));

    const menu = await menuPriceFor(d);
    const costPerMeal = people > 0 ? Math.round(cost / people) : 0;

    return {
      date: d,
      mealName: menu.name,
      people,
      cost,
      purchased: purchaseByDate.get(d) ?? 0,
      costPerMeal,
      chargedPerMeal: menu.price,
      marginPerMeal: menu.price - costPerMeal,
      totalCharged: menu.price * people,
      totalMargin: (menu.price - costPerMeal) * people,
    };
  }));

  const totalCost = days.reduce((s, d) => s + d.cost, 0);
  const totalMeals = days.reduce((s, d) => s + d.people, 0);
  const totalCharged = days.reduce((s, d) => s + d.totalCharged, 0);
  const totalPurchased = days.reduce((s, d) => s + d.purchased, 0);

  return {
    year,
    month,
    days,
    summary: {
      daysCooked: days.length,
      totalMeals,
      totalCost,
      totalPurchased,
      totalCharged,
      totalMargin: totalCharged - totalCost,
      avgCostPerMeal: totalMeals > 0 ? Math.round(totalCost / totalMeals) : 0,
      avgChargedPerMeal: totalMeals > 0 ? Math.round(totalCharged / totalMeals) : 0,
    },
  };
}

export { markOrphan };