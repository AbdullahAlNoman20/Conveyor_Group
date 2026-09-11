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

export async function statement(clientId: string, year: number, month: number) {
  const from = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);

  const rows = await db.execute<{
    id: string; created_at: string; status: string; amount: string; items: string;
  }>(sql`
    SELECT o.id, o.created_at, o.status, o.amount,
           COALESCE(string_agg(oi.qty || 'x ' || oi.name, ', ' ORDER BY oi.id), '') AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.client_id = ${clientId}
      AND o.order_date BETWEEN ${from} AND ${to}
      AND o.status NOT IN ('cancelled','rejected')
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `);

  const [agg] = await db.execute<{ days_eaten: number; total: string; orders_count: number }>(sql`
    SELECT count(DISTINCT order_date)::int AS days_eaten,
           COALESCE(sum(amount),0)         AS total,
           count(*)::int                   AS orders_count
    FROM orders
    WHERE client_id = ${clientId} AND order_date BETWEEN ${from} AND ${to}
      AND status NOT IN ('cancelled','rejected')
  `);

  const months = await db.execute<{ y: number; m: number }>(sql`
    SELECT DISTINCT extract(year FROM order_date)::int AS y,
                    (extract(month FROM order_date)::int - 1) AS m
    FROM orders WHERE client_id = ${clientId} AND status NOT IN ('cancelled','rejected')
  `);

  return {
    year, month,
    orders: rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      status: r.status,
      amount: Number(r.amount),
      items: escapeHtml(r.items),
    })),
    daysEaten: agg!.days_eaten,
    totalOrders: agg!.orders_count,
    totalAmount: Number(agg!.total),
    monthsWithData: months.map((m) => `${m.y}-${m.m}`),
  };
}

export async function clientDue(clientId: string): Promise<number> {
  const [row] = await db.execute<{ monthly_bill: string }>(sql`
    SELECT monthly_bill FROM clients WHERE id = ${clientId}
  `);
  return Number(row?.monthly_bill ?? 0);
}

export async function clientSpend(clientId: string) {
  const [row] = await db.execute<{
    today_count: number; today_sum: string; week_sum: string;
    month_count: number; month_sum: string;
  }>(sql`
    SELECT
      count(*) FILTER (WHERE order_date = current_date)::int AS today_count,
      COALESCE(sum(amount) FILTER (WHERE order_date = current_date), 0) AS today_sum,
      COALESCE(sum(amount) FILTER (WHERE order_date >= date_trunc('week', current_date)), 0) AS week_sum,
      count(*) FILTER (WHERE date_trunc('month', order_date) = date_trunc('month', current_date))::int AS month_count,
      COALESCE(sum(amount) FILTER (WHERE date_trunc('month', order_date) = date_trunc('month', current_date)), 0) AS month_sum
    FROM orders
    WHERE client_id = ${clientId} AND status NOT IN ('cancelled','rejected')
  `);
  return {
    todayOrders: row!.today_count,
    todaySpend: Number(row!.today_sum),
    weekSpend: Number(row!.week_sum),
    monthOrders: row!.month_count,
    monthSpend: Number(row!.month_sum),
  };
}

export const refreshDashboardViews = () =>
  db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_diner_summary`);