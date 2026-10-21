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

export async function getShoppingList(id: string) {
  const list = await db.query.shoppingLists.findFirst({ where: eq(shoppingLists.id, id) });
  if (!list) throw notFound();

  // Current stock travels with the line so the Manager can see, at the moment
  // of shopping, whether anything actually needs buying.
  const rows = await db.execute<{
    id: number; item_id: string; name: string; unit: string;
    qty: string; note: string | null; current_qty: string; avg_unit_cost: string;
  }>(sql`
    SELECT li.id, li.item_id, i.name, i.unit, li.qty, li.note,
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
    items: rows.map((r) => ({
      id: r.id,
      itemId: r.item_id,
      name: escapeHtml(r.name),
      unit: r.unit,
      qty: n(r.qty),
      note: escapeHtml(r.note ?? ""),
      inStock: n(r.current_qty),
      avgUnitCost: n(r.avg_unit_cost),
      estimatedCost: Math.round(n(r.qty) * n(r.avg_unit_cost)),
    })),
  };
}

export async function saveShoppingList(input: {
  id?: string;
  forDate: string;
  notes?: string;
  items: { itemId: string; qty: number; note?: string }[];
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
  items: { itemId: string; qty: number; lineCost: number }[];
  userId: string;
}) {
  if (!input.items.length) {
    throw new AppError("VALIDATION_ERROR", 422, {}, "Add at least one purchased item.");
  }

  const id = genId("PUR");
  const totalCost = input.items.reduce((s, it) => s + it.lineCost, 0);

  await db.transaction(async (tx) => {
    await tx.insert(purchases).values({
      id,
      listId: input.listId ?? null,
      purchaseDate: input.purchaseDate,
      voucherPath: input.voucherPath ?? null,
      totalCost: String(totalCost),
      notes: sanitizeText(input.notes, 300) || null,
      createdBy: input.userId,
    });

    for (const line of input.items) {
      const item = await tx.query.inventoryItems.findFirst({
        where: eq(inventoryItems.id, line.itemId),
      });
      if (!item) throw notFound();

      const oldQty = n(item.currentQty);
      const oldAvg = n(item.avgUnitCost);
      const newQty = oldQty + line.qty;
      const unitCost = line.qty > 0 ? line.lineCost / line.qty : 0;
      const newAvg = newQty > 0 ? (oldQty * oldAvg + line.lineCost) / newQty : unitCost;

      await tx.insert(purchaseItems).values({
        purchaseId: id,
        itemId: line.itemId,
        qty: String(line.qty),
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
        qtyDelta: String(line.qty),
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

  emitCollectionChanged("inventory", ["manager", "super_admin"]);
  emitCollectionChanged("shoppingLists", ["manager", "super_admin"]);
  return { id, totalCost };
}

export async function listPurchases(limit = 30) {
  const rows = await db.execute<{
    id: string; purchase_date: string; total_cost: string;
    voucher_path: string | null; notes: string | null; item_count: number;
  }>(sql`
    SELECT p.id, p.purchase_date::text AS purchase_date, p.total_cost,
           p.voucher_path, p.notes, count(pi.id)::int AS item_count
    FROM purchases p
    LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
    GROUP BY p.id
    ORDER BY p.purchase_date DESC, p.created_at DESC
    LIMIT ${limit}
  `);

  return Promise.all(rows.map(async (r) => ({
    id: r.id,
    date: r.purchase_date,
    totalCost: n(r.total_cost),
    itemCount: r.item_count,
    notes: escapeHtml(r.notes ?? ""),
    voucher: await signedUrl(r.voucher_path),
  })));
}

export async function getPurchase(id: string) {
  const row = await db.query.purchases.findFirst({ where: eq(purchases.id, id) });
  if (!row) throw notFound();

  const lines = await db.execute<{
    name: string; unit: string; qty: string; line_cost: string;
  }>(sql`
    SELECT i.name, i.unit, pi.qty, pi.line_cost
    FROM purchase_items pi
    JOIN inventory_items i ON i.id = pi.item_id
    WHERE pi.purchase_id = ${id}
    ORDER BY i.name
  `);

  return {
    id: row.id,
    date: row.purchaseDate,
    totalCost: n(row.totalCost),
    notes: escapeHtml(row.notes ?? ""),
    voucher: await signedUrl(row.voucherPath),
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