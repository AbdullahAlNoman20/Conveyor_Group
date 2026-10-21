// server/src/services/dev.service.ts
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { businessDate, cutoffLabel, getDevOffset, localHour, now, orderWindowLabel, orderWindowOpen, setDevOffset } from "../lib/clock.js";
import { genId } from "../lib/ids.js";
import { logger } from "../lib/logger.js";
import { sweepNoShows } from "./attendance.service.js";
import { emitCollectionChanged } from "../sockets/index.js";

function assertEnabled(): void {
  if (!env.DEV_TOOLS) {
    throw new AppError("FORBIDDEN", 403, {}, "Development tools are disabled.");
  }
}

export function clockStatus() {
  assertEnabled();
  const offset = getDevOffset();
  return {
    enabled: true,
    simulatedNow: now().toISOString(),
    realNow: new Date().toISOString(),
    offsetMs: offset,
    offsetDays: Math.round(offset / 86_400_000),
    businessDate: businessDate(),
    localHour: localHour(),
    timezone: env.APP_TIMEZONE,
    cancellationCutoff: cutoffLabel(),
    orderWindow: orderWindowLabel(),
    orderWindowOpen: orderWindowOpen(),
  };
}

/** Moves the simulated clock. `days` and `hours` are relative to real time. */
export function setClock(input: { days?: number; hours?: number; reset?: boolean }) {
  assertEnabled();

  if (input.reset) {
    setDevOffset(0);
  } else {
    const ms = (input.days ?? 0) * 86_400_000 + (input.hours ?? 0) * 3_600_000;
    setDevOffset(ms);
  }

  const status = clockStatus();
  logger.warn({ status }, "DEV: simulated clock changed");
  // Every screen reads dates and windows, so nudge them all.
  emitCollectionChanged("attendance", ["manager", "accounts", "super_admin", "client"]);
  emitCollectionChanged("orders", ["manager", "accounts", "super_admin", "client"]);
  return status;
}

/** Jumps the clock forward by whole days, relative to where it already is. */
export function advanceDays(days: number) {
  assertEnabled();
  setDevOffset(getDevOffset() + days * 86_400_000);
  const status = clockStatus();
  logger.warn({ status, days }, "DEV: clock advanced");
  emitCollectionChanged("attendance", ["manager", "accounts", "super_admin", "client"]);
  emitCollectionChanged("orders", ["manager", "accounts", "super_admin", "client"]);
  return status;
}

/**
 * Generates a realistic back-history so the monthly cost and attendance
 * reports have something to show without waiting a month.
 *
 * For each past day it writes attendance (mostly collected, a few cancelled, a
 * few missed), a market purchase, and the ingredients cooked with — the same
 * rows the real flow would have produced, so every report reads them normally.
 */
export async function generateHistory(days: number) {
  assertEnabled();
  if (days < 1 || days > 120) {
    throw new AppError("VALIDATION_ERROR", 422, {}, "Generate between 1 and 120 days.");
  }

  const clients = await db.execute<{ id: string; name: string; employee_id: string; department: string; meal_benefit: string }>(sql`
    SELECT id, name, employee_id, department, meal_benefit
    FROM clients WHERE status = 'active' AND meal_plan = 'Fixed Company Meal'
  `);

  if (!clients.length) {
    throw new AppError("VALIDATION_ERROR", 422, {}, "Seed some clients first.");
  }

  const items = await db.execute<{ id: string; name: string; avg_unit_cost: string }>(sql`
    SELECT id, name, avg_unit_cost FROM inventory_items WHERE active = true LIMIT 8
  `);

  const today = new Date(`${businessDate()}T00:00:00Z`);
  let attendanceRows = 0;
  let cookedDays = 0;

  for (let back = days; back >= 1; back--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - back);
    const date = d.toISOString().slice(0, 10);

    // A deterministic pseudo-random per day keeps repeated runs stable.
    const seed = (back * 2654435761) % 100;

    const [menu] = await db.execute<{ meal_name: string; price: string | null }>(sql`
      SELECT w.meal_name, m.price FROM weekly_menu w
      LEFT JOIN menu_items m ON m.id = w.menu_item_id
      WHERE w.day = to_char(${date}::date, 'FMDay')
    `);
    const price = Number(menu?.price ?? 0);

    for (let i = 0; i < clients.length; i++) {
      const c = clients[i]!;
      const roll = (seed + i * 17) % 10;
      // ~70% collected, 20% cancelled, 10% missed — enough of each to exercise
      // every branch of the reports.
      const status = roll < 7 ? "collected" : roll < 9 ? "cancelled" : "no_show";
      const charge =
        status === "cancelled" || c.meal_benefit === "Complimentary" ? 0 : price;

      await db.execute(sql`
        INSERT INTO meal_attendance
          (date, client_id, client_name, employee_id, department, status, amount, charged, decided_at)
        VALUES (${date}, ${c.id}, ${c.name}, ${c.employee_id}, ${c.department},
                ${status}, ${charge}, ${charge > 0}, now())
        ON CONFLICT (date, client_id) DO NOTHING
      `);
      attendanceRows += 1;
    }

    if (items.length) {
      const purchaseId = genId("PUR");
      let total = 0;

      await db.execute(sql`
        INSERT INTO purchases (id, purchase_date, total_cost, notes)
        VALUES (${purchaseId}, ${date}, 0, 'Generated sample data')
      `);

      for (let i = 0; i < Math.min(4, items.length); i++) {
        const item = items[i]!;
        const rate = Number(item.avg_unit_cost) || 60;
        const qty = 2 + ((seed + i) % 5);
        const lineCost = Math.round(qty * rate);
        total += lineCost;

        await db.execute(sql`
          INSERT INTO purchase_items (purchase_id, item_id, qty, line_cost)
          VALUES (${purchaseId}, ${item.id}, ${qty}, ${lineCost})
        `);

        const usedQty = Math.max(1, Math.round(qty * 0.8));
        const cost = Math.round(usedQty * rate);

        await db.execute(sql`
          INSERT INTO consumptions (id, used_date, item_id, qty, unit_cost, cost, note)
          VALUES (${genId("CON")}, ${date}, ${item.id}, ${usedQty}, ${rate}, ${cost},
                  'Generated sample data')
        `);
      }

      await db.execute(sql`
        UPDATE purchases SET total_cost = ${total} WHERE id = ${purchaseId}
      `);
      cookedDays += 1;
    }
  }

  // Stock figures are left alone on purpose: this writes history, and
  // rewinding today's balance would contradict what is physically on the shelf.
  logger.warn({ days, attendanceRows, cookedDays }, "DEV: sample history generated");
  emitCollectionChanged("attendance", ["manager", "accounts", "super_admin"]);
  emitCollectionChanged("inventory", ["manager", "accounts", "super_admin"]);

  return { days, attendanceRows, cookedDays };
}

/** Wipes generated rows so a test run can start clean. */
export async function clearGenerated() {
  assertEnabled();

  const result = await db.transaction(async (tx) => {
    const consumption = await tx.execute(sql`
      DELETE FROM consumptions WHERE note = 'Generated sample data' RETURNING id
    `);
    const purchases = await tx.execute(sql`
      DELETE FROM purchases WHERE notes = 'Generated sample data' RETURNING id
    `);
    // Only days before today — today's real activity stays.
    const attendance = await tx.execute(sql`
      DELETE FROM meal_attendance WHERE date < ${businessDate()} RETURNING date
    `);
    return {
      consumption: consumption.length,
      purchases: purchases.length,
      attendance: attendance.length,
    };
  });

  emitCollectionChanged("attendance", ["manager", "accounts", "super_admin"]);
  emitCollectionChanged("inventory", ["manager", "accounts", "super_admin"]);
  return result;
}

/** Runs the end-of-day charge immediately instead of waiting for the cron. */
export async function closeDay(date?: string) {
  assertEnabled();
  return sweepNoShows(date ?? businessDate());
}

/** Clears today's attendance so the same flow can be walked again. */
export async function resetToday() {
  assertEnabled();
  const date = businessDate();

  const result = await db.transaction(async (tx) => {
    const orders = await tx.execute(sql`
      DELETE FROM orders WHERE order_date = ${date} RETURNING id, client_id, amount
    `);
    await tx.execute(sql`DELETE FROM meal_attendance WHERE date = ${date}`);
    await tx.execute(sql`UPDATE meal_limits SET served = 0 WHERE date = ${date}`);

    // Unwind the money too, or the balance keeps a charge whose order is gone.
    for (const o of orders as unknown as { client_id: string; amount: string }[]) {
      await tx.execute(sql`
        UPDATE clients
        SET monthly_bill = GREATEST(0, monthly_bill - ${Number(o.amount)})
        WHERE id = ${o.client_id}
      `);
    }
    return { ordersRemoved: orders.length };
  });

  logger.warn({ date, ...result }, "DEV: today reset");
  emitCollectionChanged("attendance", ["manager", "accounts", "super_admin", "client"]);
  emitCollectionChanged("orders", ["manager", "accounts", "super_admin", "client"]);
  return { date, ...result };
}