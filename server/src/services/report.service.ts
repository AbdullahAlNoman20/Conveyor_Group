// backend/src/services/report.service.ts
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { escapeHtml } from "../lib/sanitize.js";

export interface Range { from: string; to: string }

export function resolveRange(preset: string, from?: string, to?: string): Range {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const today = iso(now);

  switch (preset) {
    case "today": return { from: today, to: today };
    case "week": {
      const s = new Date(now);
      s.setDate(now.getDate() - now.getDay());
      return { from: iso(s), to: today };
    }
    case "year": return { from: `${now.getFullYear()}-01-01`, to: today };
    case "custom": return { from: from ?? "1970-01-01", to: to ?? today };
    default: return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  }
}

// Single grouped query — no N+1.
export async function whoAte(range: Range) {
  const rows = await db.execute<{
    client_name: string; days_eaten: number; orders_count: number; total: string;
  }>(sql`
    SELECT client_name,
           count(DISTINCT order_date)::int AS days_eaten,
           count(*)::int                   AS orders_count,
           sum(amount)                     AS total
    FROM orders
    WHERE order_date BETWEEN ${range.from} AND ${range.to}
      AND status NOT IN ('cancelled','rejected')
    GROUP BY client_name
    ORDER BY sum(amount) DESC
    LIMIT 500
  `);

  const diners = rows.map((r) => ({
    name: escapeHtml(r.client_name),
    daysEaten: r.days_eaten,
    orders: r.orders_count,
    total: Number(r.total),
  }));

  return {
    range, diners,
    totalDiners: diners.length,
    totalAmount: diners.reduce((s, d) => s + d.total, 0),
  };
}

export async function dinersLast7Days() {
  const rows = await db.execute<{ day: string; diners: number }>(sql`
    WITH days AS (
      SELECT generate_series(current_date - INTERVAL '6 day', current_date, INTERVAL '1 day')::date AS d
    )
    SELECT to_char(days.d, 'Dy') AS day,
           COALESCE(count(DISTINCT o.client_id), 0)::int AS diners
    FROM days
    LEFT JOIN orders o ON o.order_date = days.d AND o.status NOT IN ('cancelled','rejected')
    GROUP BY days.d ORDER BY days.d
  `);
  return rows.map((r) => ({ day: r.day.trim(), diners: r.diners }));
}

export async function dashboardTotals() {
  const [row] = await db.execute<{
    clients_total: number; clients_active: number; diners_today: number;
    amount_today: string; month_orders: number; amount_month: string;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM clients WHERE status <> 'archived') AS clients_total,
      (SELECT count(*)::int FROM clients WHERE status = 'active')    AS clients_active,
      (SELECT count(DISTINCT client_id)::int FROM orders
        WHERE order_date = current_date AND status NOT IN ('cancelled','rejected')) AS diners_today,
      (SELECT COALESCE(sum(amount),0) FROM orders
        WHERE order_date = current_date AND status NOT IN ('cancelled','rejected')) AS amount_today,
      (SELECT count(*)::int FROM orders
        WHERE date_trunc('month', order_date) = date_trunc('month', current_date)
          AND status NOT IN ('cancelled','rejected')) AS month_orders,
      (SELECT COALESCE(sum(amount),0) FROM orders
        WHERE date_trunc('month', order_date) = date_trunc('month', current_date)
          AND status NOT IN ('cancelled','rejected')) AS amount_month
  `);
  return {
    clientsTotal: row!.clients_total,
    clientsActive: row!.clients_active,
    dinersToday: row!.diners_today,
    amountToday: Number(row!.amount_today),
    monthOrders: row!.month_orders,
    amountMonth: Number(row!.amount_month),
  };
}

/**
 * Monthly statement.
 *
 * Built from `meal_attendance`, not `orders`, because a missed meal is charged
 * without ever producing an order row — reading orders alone made the
 * statement total disagree with the running balance on the dashboard.
 *
 * Every day the employee was scheduled produces one line: the meal they
 * collected, the meal they cancelled in time (Tk 0), or the meal that was
 * cooked and never collected (charged in full).
 */
export async function statement(clientId: string, year: number, month: number) {
  const from = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);

  const rows = await db.execute<{
    date: string;
    kind: string;
    order_id: string | null;
    at: string;
    amount: string;
    items: string;
  }>(sql`
    SELECT a.date::text                       AS date,
           a.status                           AS kind,
           a.order_id,
           COALESCE(o.created_at, a.decided_at, a.created_at) AS at,
           a.amount,
           COALESCE(
             (SELECT string_agg(oi.qty || 'x ' || oi.name, ', ' ORDER BY oi.id)
              FROM order_items oi WHERE oi.order_id = o.id),
             ''
           ) AS items
    FROM meal_attendance a
    LEFT JOIN orders o
           ON o.id = a.order_id
          AND o.status NOT IN ('cancelled','rejected')
    WHERE a.client_id = ${clientId}
      AND a.date BETWEEN ${from} AND ${to}
      AND a.status <> 'pending'
    ORDER BY a.date DESC
  `);

  const [agg] = await db.execute<{
    days_eaten: number;
    collected_total: string;
    no_show_count: number;
    no_show_total: string;
    cancelled_count: number;
  }>(sql`
    SELECT count(*) FILTER (WHERE status = 'collected')::int              AS days_eaten,
           COALESCE(sum(amount) FILTER (WHERE status = 'collected'), 0)   AS collected_total,
           count(*) FILTER (WHERE status = 'no_show')::int                AS no_show_count,
           COALESCE(sum(amount) FILTER (WHERE status = 'no_show'), 0)     AS no_show_total,
           count(*) FILTER (WHERE status = 'cancelled')::int              AS cancelled_count
    FROM meal_attendance
    WHERE client_id = ${clientId} AND date BETWEEN ${from} AND ${to}
  `);

  const months = await db.execute<{ y: number; m: number }>(sql`
    SELECT DISTINCT extract(year FROM date)::int AS y,
                    (extract(month FROM date)::int - 1) AS m
    FROM meal_attendance
    WHERE client_id = ${clientId} AND status <> 'pending'
  `);

  const LABELS: Record<string, string> = {
    collected: "Meal collected",
    no_show: "Missed — not cancelled",
    cancelled: "Cancelled in time",
  };

  const entries = rows.map((r) => ({
    // No-show days have no order, so the row is keyed by date instead.
    id: r.order_id ?? `${r.kind}-${r.date}`,
    orderId: r.order_id,
    date: r.date,
    createdAt: r.at,
    kind: r.kind,
    label: LABELS[r.kind] ?? r.kind,
    items: escapeHtml(r.items),
    amount: Number(r.amount),
  }));

  const collectedTotal = Number(agg!.collected_total);
  const noShowTotal = Number(agg!.no_show_total);

  return {
    year,
    month,
    entries,
    // Kept under the old key so existing callers keep working.
    orders: entries,
    daysEaten: agg!.days_eaten,
    totalOrders: agg!.days_eaten,
    collectedTotal,
    noShowCount: agg!.no_show_count,
    noShowTotal,
    cancelledCount: agg!.cancelled_count,
    // What actually reaches payroll: meals taken plus meals wasted.
    totalAmount: collectedTotal + noShowTotal,
    monthsWithData: months.map((m) => `${m.y}-${m.m}`),
  };
}

export async function clientDue(clientId: string): Promise<number> {
  const [row] = await db.execute<{ monthly_bill: string }>(sql`
    SELECT monthly_bill FROM clients WHERE id = ${clientId}
  `);
  return Number(row?.monthly_bill ?? 0);
}

/**
 * Dashboard spend bars. Read from attendance so a missed, charged meal shows
 * up here too — otherwise the bars undercount against the running balance.
 */
export async function clientSpend(clientId: string) {
  const [row] = await db.execute<{
    today_count: number; today_sum: string; week_sum: string;
    month_count: number; month_sum: string; month_no_show: string;
  }>(sql`
    SELECT
      count(*) FILTER (WHERE date = current_date AND status = 'collected')::int AS today_count,
      COALESCE(sum(amount) FILTER (WHERE date = current_date), 0) AS today_sum,
      COALESCE(sum(amount) FILTER (WHERE date >= date_trunc('week', current_date)), 0) AS week_sum,
      count(*) FILTER (
        WHERE date_trunc('month', date) = date_trunc('month', current_date)
          AND status = 'collected'
      )::int AS month_count,
      COALESCE(sum(amount) FILTER (
        WHERE date_trunc('month', date) = date_trunc('month', current_date)
      ), 0) AS month_sum,
      COALESCE(sum(amount) FILTER (
        WHERE date_trunc('month', date) = date_trunc('month', current_date)
          AND status = 'no_show'
      ), 0) AS month_no_show
    FROM meal_attendance
    WHERE client_id = ${clientId}
  `);

  return {
    todayOrders: row!.today_count,
    todaySpend: Number(row!.today_sum),
    weekSpend: Number(row!.week_sum),
    monthOrders: row!.month_count,
    monthSpend: Number(row!.month_sum),
    // Broken out so the dashboard can show what was paid for nothing.
    monthNoShowSpend: Number(row!.month_no_show),
  };
}

export const refreshDashboardViews = () =>
  db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_diner_summary`);