// backend/src/services/menu.service.ts
import { db } from "../db/index.js";
import { weeklyMenu } from "../db/schema.js";
import { menuRepo } from "../repositories/menu.repo.js";
import { CACHE_KEYS, cached, invalidate } from "../lib/redis.js";
import { genId } from "../lib/ids.js";
import { conflict, notFound } from "../lib/errors.js";
import { escapeHtml, sanitizeText } from "../lib/sanitize.js";
import { markOrphan, signedUrlMany } from "../storage/supabase.js";
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
      .map((d) => ({ day: d.day, meal: escapeHtml(d.mealName) }));
  });
}

export async function saveWeeklyMenu(days: { day: string; meal: string }[], userId: string) {
  const menu = await menuRepo.all();
  const byName = new Map(menu.map((m) => [m.name.toLowerCase(), m.id]));

  await db.transaction(async (tx) => {
    for (const d of days) {
      const mealName = sanitizeText(d.meal, 100);
      const menuItemId = byName.get(mealName.toLowerCase()) ?? null;
      await tx.insert(weeklyMenu)
        .values({ day: d.day, mealName, menuItemId, updatedBy: userId })
        .onConflictDoUpdate({
          target: weeklyMenu.day,
          set: { mealName, menuItemId, updatedBy: userId, updatedAt: new Date() },
        });
    }
  });

  await invalidate(CACHE_KEYS.weeklyMenu);
  emitCollectionChanged("weeklyMenu", ["manager", "super_admin", "client"]);
  return getWeeklyMenu();
}

async function bust(): Promise<void> {
  await invalidate(CACHE_KEYS.menuAll, CACHE_KEYS.menuAvail);
  emitCollectionChanged("menu", ["super_admin", "manager", "client"]);
}