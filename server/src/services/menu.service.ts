// backend/src/services/menu.service.ts
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { menuItemIngredients, weeklyMenu } from "../db/schema.js";
import { menuRepo } from "../repositories/menu.repo.js";
import { CACHE_KEYS, cached, invalidate } from "../lib/redis.js";
import { genId } from "../lib/ids.js";
import { conflict, notFound } from "../lib/errors.js";
import { escapeHtml, sanitizeText } from "../lib/sanitize.js";
import { markOrphan, signedUrlMany } from "../storage/index.js";
import { emitCollectionChanged } from "../sockets/index.js";

const DAY_ORDER = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export async function listMenu(onlyAvailable = false) {
  const key = onlyAvailable ? CACHE_KEYS.menuAvail : CACHE_KEYS.menuAll;
  return cached(key, 120, async () => {
    const rows = onlyAvailable ? await menuRepo.available() : await menuRepo.all();
    const urls = await signedUrlMany(rows.map((r) => r.imagePath));
    return rows.map((m) => ({
      id: m.id,
      name: escapeHtml(m.name),
      category: m.category,
      price: Number(m.price),
      available: m.available,
      description: escapeHtml(m.description ?? ""),
      spiceLevel: m.spiceLevel ?? "-",
      calories: m.calories,
      allergens: m.allergens,
      image: m.imagePath ? urls.get(m.imagePath) ?? null : null,
      imageName: m.imageName,
    }));
  });
}

export async function getMenuItem(id: string) {
  const row = await menuRepo.byId(id);
  if (!row) throw notFound("MENU_ITEM_NOT_FOUND");
  return (await listMenu()).find((m) => m.id === id)!;
}

export async function createMenuItem(input: Record<string, unknown>) {
  const name = sanitizeText(input.name, 100);
  if (await menuRepo.byName(name)) throw conflict("DUPLICATE_NAME");

  const [row] = await menuRepo.insert({
    id: genId("M"),
    name,
    category: input.category as string,
    price: String(input.price),
    spiceLevel: sanitizeText(input.spiceLevel, 20) || null,
    description: sanitizeText(input.description, 500) || null,
    calories: (input.calories as number | undefined) ?? null,
    allergens: (input.allergens as string[] | undefined) ?? [],
    imagePath: (input.imagePath as string | undefined) ?? null,
    imageName: sanitizeText(input.imageName, 255) || null,
    available: input.available !== false,
  });
  await bust();
  return row!;
}

// Partial patch — a field the form doesn't submit is never nulled, so editing
// a dish no longer wipes its calories and allergens.
export async function patchMenuItem(id: string, input: Record<string, unknown>) {
  const before = await menuRepo.byId(id);
  if (!before) throw notFound("MENU_ITEM_NOT_FOUND");

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = sanitizeText(input.name, 100);
  if (input.category !== undefined) patch.category = input.category;
  if (input.price !== undefined) patch.price = String(input.price);
  if (input.spiceLevel !== undefined) patch.spiceLevel = sanitizeText(input.spiceLevel, 20);
  if (input.description !== undefined) patch.description = sanitizeText(input.description, 500);
  if (input.calories !== undefined) patch.calories = input.calories;
  if (input.allergens !== undefined) patch.allergens = input.allergens;
  if (input.available !== undefined) patch.available = input.available;
  if (input.imageName !== undefined) patch.imageName = sanitizeText(input.imageName, 255);
  if (input.imagePath !== undefined) {
    patch.imagePath = input.imagePath;
    if (before.imagePath && before.imagePath !== input.imagePath) await markOrphan(before.imagePath);
  }

  const [after] = await menuRepo.patch(id, patch);
  await bust();
  return { before, after: after! };
}

export async function removeMenuItem(id: string) {
  const before = await menuRepo.byId(id);
  if (!before) throw notFound("MENU_ITEM_NOT_FOUND");
  await menuRepo.softDelete(id); // soft delete keeps order history intact
  await markOrphan(before.imagePath);
  await bust();
  return before;
}

export async function getWeeklyMenu() {
  return cached(CACHE_KEYS.weeklyMenu, 120, async () => {
    const rows = await menuRepo.week();
    return rows
      .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
      .map((d) => ({ day: d.day, meal: escapeHtml(d.mealName), menuItemId: d.menuItemId }));
  });
}

/**
 * The raw items a dish is made from.
 *
 * Recorded once on the planner and reused by every shopping list for that
 * dish, so nobody has to remember what goes into a khichuri at the market.
 */
export async function getIngredients(menuItemId: string) {
  const rows = await db.execute<{
    id: number; item_id: string; name: string; unit: string; default_unit: string | null;
    default_qty: string | null; current_qty: string; avg_unit_cost: string;
  }>(sql`
    SELECT mi.id, mi.item_id, i.name, i.unit, mi.default_qty, mi.default_unit,
           i.current_qty, i.avg_unit_cost
    FROM menu_item_ingredients mi
    JOIN inventory_items i ON i.id = mi.item_id
    WHERE mi.menu_item_id = ${menuItemId}
    ORDER BY i.name
  `);

  return rows.map((r) => ({
    id: r.id,
    itemId: r.item_id,
    name: escapeHtml(r.name),
    unit: r.default_unit || r.unit,
    stockUnit: r.unit,
    defaultQty: r.default_qty === null ? null : Number(r.default_qty),
    inStock: Number(r.current_qty),
    avgUnitCost: Number(r.avg_unit_cost),
  }));
}

/** Replaces a dish's ingredient list wholesale. */
export async function setIngredients(
  menuItemId: string,
  items: { itemId: string; defaultQty?: number | null; defaultUnit?: string; note?: string }[],
) {
  const dish = await menuRepo.byId(menuItemId);
  if (!dish) throw notFound("MENU_ITEM_NOT_FOUND");

  await db.transaction(async (tx) => {
    await tx.delete(menuItemIngredients).where(eq(menuItemIngredients.menuItemId, menuItemId));

    // Two lines for the same item would make the shopping list show it twice,
    // so duplicates are collapsed rather than rejected.
    const seen = new Set<string>();
    const rows = items.filter((i) => {
      if (seen.has(i.itemId)) return false;
      seen.add(i.itemId);
      return true;
    });

    if (rows.length) {
      await tx.insert(menuItemIngredients).values(
        rows.map((i) => ({
          menuItemId,
          itemId: i.itemId,
          defaultQty: i.defaultQty === null || i.defaultQty === undefined ? null : String(i.defaultQty),
          defaultUnit: i.defaultUnit || null,
          note: sanitizeText(i.note, 120) || null,
        })),
      );
    }
  });

  await invalidate(CACHE_KEYS.weeklyMenu);
  emitCollectionChanged("menu", ["manager", "accounts", "super_admin"]);
  return getIngredients(menuItemId);
}


export async function saveWeeklyMenu(
  days: { day: string; menuItemId?: string; meal?: string }[],
  userId: string,
) {
  const menu = await menuRepo.all();
  const byId = new Map(menu.map((m) => [m.id, m]));
  const byName = new Map(menu.map((m) => [m.name.toLowerCase(), m]));

  await db.transaction(async (tx) => {
    for (const d of days) {
      // The id wins. The name is only a fallback for older callers.
      const dish = d.menuItemId
        ? byId.get(d.menuItemId)
        : d.meal
          ? byName.get(sanitizeText(d.meal, 100).toLowerCase())
          : undefined;

      if (d.menuItemId && !dish) {
        throw conflict("VALIDATION_ERROR", { message: `The dish for ${d.day} no longer exists. Pick another one.` });
      }

      // Nothing picked: no meal that day.
      if (!dish) {
        await tx.delete(weeklyMenu).where(eq(weeklyMenu.day, d.day));
        continue;
      }

      await tx.insert(weeklyMenu)
        .values({ day: d.day, mealName: dish.name, menuItemId: dish.id, updatedBy: userId })
        .onConflictDoUpdate({
          target: weeklyMenu.day,
          set: { mealName: dish.name, menuItemId: dish.id, updatedBy: userId, updatedAt: new Date() },
        });
    }
  });

  await invalidate(CACHE_KEYS.weeklyMenu);
  emitCollectionChanged("weeklyMenu", ["manager", "super_admin", "client"]);
  return getWeeklyMenu();
}

export { menuItemIngredients };

async function bust(): Promise<void> {
  await invalidate(CACHE_KEYS.menuAll, CACHE_KEYS.menuAvail);
  emitCollectionChanged("menu", ["super_admin", "manager", "client"]);
}