// server/src/services/attendance.service.ts
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { mealAttendance } from "../db/schema.js";
import { clientRepo, type ClientRow } from "../repositories/client.repo.js";
import { todaysFixedMeal } from "./order.service.js";
import { notifyEvent, SOCKET_EVENTS } from "./notification.service.js";
import { emitCollectionChanged } from "../sockets/index.js";
import { businessDate, cancellationOpen, cutoffLabel, minutesUntilCutoff } from "../lib/clock.js";
import { AppError, notFound } from "../lib/errors.js";
import { escapeHtml } from "../lib/sanitize.js";
import { logger } from "../lib/logger.js";

export type AttendanceStatus = "pending" | "cancelled" | "collected" | "no_show";

/**
 * Attendance is opt-OUT: every active Fixed-Meal client is scheduled for the
 * day's meal unless they cancel before the cutoff. A row is only written when
 * something actually happens (cancel, collect, or the nightly sweep), so the
 * table stays small and "no row" simply means "still pending".
 */
async function upsert(
  client: Pick<ClientRow, "id" | "name" | "employeeId" | "department">,
  date: string,
  patch: {
    status: AttendanceStatus;
    orderId?: string | null;
    amount?: number;
    charged?: boolean;
    cancelledAt?: Date | null;
  },
) {
  const [row] = await db
    .insert(mealAttendance)
    .values({
      date,
      clientId: client.id,
      clientName: client.name,
      employeeId: client.employeeId,
      department: client.department,
      status: patch.status,
      orderId: patch.orderId ?? null,
      amount: String(patch.amount ?? 0),
      charged: patch.charged ?? false,
      cancelledAt: patch.cancelledAt ?? null,
      decidedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [mealAttendance.date, mealAttendance.clientId],
      set: {
        status: patch.status,
        orderId: patch.orderId ?? null,
        amount: String(patch.amount ?? 0),
        charged: patch.charged ?? false,
        cancelledAt: patch.cancelledAt ?? null,
        decidedAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning();

  return row!;
}

export async function getForClient(clientId: string, date = businessDate()) {
  const row = await db.query.mealAttendance.findFirst({
    where: and(eq(mealAttendance.date, date), eq(mealAttendance.clientId, clientId)),
  });
  return row ?? null;
}

/** What the client's dashboard needs to render today's card. */
export async function todayStatusFor(client: ClientRow) {
  const date = businessDate();
  const row = await getForClient(client.id, date);
  const meal = await todaysFixedMeal().catch(() => null);

  const status: AttendanceStatus = (row?.status as AttendanceStatus) ?? "pending";

  return {
    date,
    status,
    mealName: meal?.name ?? null,
    mealPrice: meal?.price ?? 0,
    amountCharged: Number(row?.amount ?? 0),
    // Collecting and cancelling are both one-way doors once taken.
    canCancel: status === "pending" && cancellationOpen(),
    canOrder: status === "pending",
    cancellationOpen: cancellationOpen(),
    minutesUntilCutoff: minutesUntilCutoff(),
    cutoffLabel: cutoffLabel(),
  };
}

/** Client opts out of today's meal. Only possible before the cutoff. */
export async function cancelToday(client: ClientRow) {
  const date = businessDate();

  if (!cancellationOpen()) {
    throw new AppError(
      "CANCEL_WINDOW_CLOSED",
      409,
      { cutoff: cutoffLabel() },
      `Cancellations close at ${cutoffLabel()}. Today's meal is already committed.`,
    );
  }

  const existing = await getForClient(client.id, date);

  if (existing?.status === "collected") {
    throw new AppError("ALREADY_COLLECTED", 409);
  }
  if (existing?.status === "cancelled") {
    return existing; // idempotent — a double tap isn't an error
  }

  const row = await upsert(client, date, {
    status: "cancelled",
    amount: 0,
    charged: false,
    cancelledAt: new Date(),
  });

  await notifyEvent(SOCKET_EVENTS.MEAL_CANCELLED, {
    message: `${client.name} cancelled today's meal.`,
    recipientRoles: ["manager", "super_admin"],
  });
  emitCollectionChanged("attendance", ["manager", "super_admin"]);

  return row;
}

/** Called from the order path once a meal is actually taken. */
export async function markCollected(
  client: ClientRow,
  orderId: string,
  amount: number,
  date = businessDate(),
) {
  await upsert(client, date, {
    status: "collected",
    orderId,
    amount,
    charged: amount > 0,
  });
  emitCollectionChanged("attendance", ["manager", "super_admin"]);
}

/** Undoes a collection when its order is cancelled or rejected. */
export async function clearCollection(clientId: string, date: string) {
  await db
    .delete(mealAttendance)
    .where(
      and(
        eq(mealAttendance.date, date),
        eq(mealAttendance.clientId, clientId),
        eq(mealAttendance.status, "collected"),
      ),
    );
  emitCollectionChanged("attendance", ["manager", "super_admin"]);
}

/** Blocks ordering for someone who opted out — the kitchen didn't cook for them. */
export async function assertNotCancelled(clientId: string, date = businessDate()) {
  const row = await getForClient(clientId, date);
  if (row?.status === "cancelled") {
    throw new AppError(
      "MEAL_CANCELLED_TODAY",
      409,
      {},
      "You cancelled today's meal, so it wasn't prepared for you.",
    );
  }
}

/**
 * Nightly sweep. Anyone who neither cancelled nor collected is charged.
 *
 * Runs in one statement per step and is safe to re-run: the composite primary
 * key plus the `charged` flag mean a second pass can't double-bill.
 */
export async function sweepNoShows(date = businessDate()) {
  const meal = await todaysFixedMeal().catch(() => null);
  if (!meal) {
    logger.warn({ date }, "no fixed meal configured — skipping no-show sweep");
    return { date, marked: 0, charged: 0 };
  }

  const result = await db.transaction(async (tx) => {
    // Complimentary clients are recorded as no-shows for reporting, but their
    // chargeable amount is zero, so they are never billed.
    const inserted = await tx.execute<{ client_id: string; amount: string }>(sql`
      INSERT INTO meal_attendance
        (date, client_id, client_name, employee_id, department, status, amount, charged, decided_at)
      SELECT ${date}, c.id, c.name, c.employee_id, c.department, 'no_show',
             CASE WHEN c.meal_benefit = 'Complimentary' THEN 0 ELSE ${meal.price} END,
             CASE WHEN c.meal_benefit = 'Complimentary' THEN false ELSE true END,
             now()
      FROM clients c
      WHERE c.status = 'active'
        AND c.meal_plan = 'Fixed Company Meal'
        AND c.qr_status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM meal_attendance a
          WHERE a.date = ${date} AND a.client_id = c.id
        )
      ON CONFLICT (date, client_id) DO NOTHING
      RETURNING client_id, amount
    `);

    // Bill each no-show exactly once, in the same transaction that created it.
    const billed = await tx.execute<{ n: number }>(sql`
      WITH charged_rows AS (
        SELECT client_id, amount FROM meal_attendance
        WHERE date = ${date} AND status = 'no_show' AND charged = true AND amount > 0
      ), applied AS (
        UPDATE clients c
        SET monthly_bill = c.monthly_bill + r.amount, updated_at = now()
        FROM charged_rows r
        WHERE c.id = r.client_id
        RETURNING c.id
      )
      SELECT count(*)::int AS n FROM applied
    `);

    return { marked: inserted.length, charged: billed[0]?.n ?? 0 };
  });

  logger.info({ date, ...result }, "no-show sweep complete");

  if (result.marked > 0) {
    await notifyEvent(SOCKET_EVENTS.NO_SHOW_SWEEP, {
      message: `${result.marked} employee(s) missed today's meal without cancelling.`,
      recipientRoles: ["manager", "super_admin"],
    });
    emitCollectionChanged("attendance", ["manager", "super_admin"]);
  }

  return { date, ...result };
}

/** Manager/Super Admin daily register. */
export async function dailyRegister(date = businessDate()) {
  const rows = await db.execute<{
    client_id: string;
    client_name: string;
    employee_id: string | null;
    department: string | null;
    status: AttendanceStatus;
    amount: string;
    cancelled_at: string | null;
  }>(sql`
    SELECT c.id AS client_id,
           c.name AS client_name,
           c.employee_id,
           c.department,
           COALESCE(a.status, 'pending') AS status,
           COALESCE(a.amount, 0) AS amount,
           a.cancelled_at
    FROM clients c
    LEFT JOIN meal_attendance a ON a.client_id = c.id AND a.date = ${date}
    WHERE c.status = 'active'
      AND c.meal_plan = 'Fixed Company Meal'
    ORDER BY
      CASE COALESCE(a.status, 'pending')
        WHEN 'no_show' THEN 1 WHEN 'pending' THEN 2
        WHEN 'collected' THEN 3 ELSE 4 END,
      c.name
  `);

  const entries = rows.map((r) => ({
    clientId: r.client_id,
    name: escapeHtml(r.client_name),
    employeeId: r.employee_id,
    department: escapeHtml(r.department ?? ""),
    status: r.status,
    amount: Number(r.amount),
    cancelledAt: r.cancelled_at,
  }));

  const count = (s: AttendanceStatus) => entries.filter((e) => e.status === s).length;

  return {
    date,
    cutoffLabel: cutoffLabel(),
    cancellationOpen: cancellationOpen(),
    entries,
    summary: {
      total: entries.length,
      collected: count("collected"),
      cancelled: count("cancelled"),
      noShow: count("no_show"),
      pending: count("pending"),
      chargedAmount: entries.reduce((s, e) => s + e.amount, 0),
      noShowAmount: entries
        .filter((e) => e.status === "no_show")
        .reduce((s, e) => s + e.amount, 0),
    },
  };
}

/** Per-client history, used by the Monthly Statement. */
export async function historyFor(clientId: string, year: number, month: number) {
  const from = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);

  const rows = await db.execute<{
    date: string;
    status: AttendanceStatus;
    amount: string;
    order_id: string | null;
  }>(sql`
    SELECT date::text, status, amount, order_id
    FROM meal_attendance
    WHERE client_id = ${clientId} AND date BETWEEN ${from} AND ${to}
    ORDER BY date DESC
  `);

  const entries = rows.map((r) => ({
    date: r.date,
    status: r.status,
    amount: Number(r.amount),
    orderId: r.order_id,
  }));

  const count = (s: AttendanceStatus) => entries.filter((e) => e.status === s).length;

  return {
    entries,
    summary: {
      collected: count("collected"),
      cancelled: count("cancelled"),
      noShow: count("no_show"),
      noShowAmount: entries
        .filter((e) => e.status === "no_show")
        .reduce((s, e) => s + e.amount, 0),
    },
  };
}

export { clientRepo, notFound };