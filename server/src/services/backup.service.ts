// backend/src/services/backup.service.ts
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";

function bounds(kind: "daily" | "weekly" | "monthly") {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (kind === "daily") return { from: iso(now), to: iso(now), label: iso(now) };
  if (kind === "weekly") {
    const f = new Date(now);
    f.setDate(now.getDate() - 7);
    return { from: iso(f), to: iso(now), label: `week-${iso(now)}` };
  }
  const f = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: iso(f), to: iso(now), label: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` };
}

export async function buildBackup(kind: "daily" | "weekly" | "monthly") {
  const { from, to, label } = bounds(kind);

  const orders = await db.execute(sql`
    SELECT o.id, o.client_name, o.employee_id, o.department, o.table_number, o.order_type,
           o.priority, o.amount, o.payment_method, o.status, o.self_placed, o.instant_order,
           o.order_date, o.created_at,
           COALESCE(json_agg(json_build_object('name', oi.name, 'qty', oi.qty, 'unitPrice', oi.unit_price))
                    FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
    FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.order_date BETWEEN ${from} AND ${to}
    GROUP BY o.id ORDER BY o.created_at
  `);

  const [clients, notifications, accountRequests] = await Promise.all([
    db.execute(sql`SELECT id, name, employee_id, department, designation, employment_type,
                          meal_plan, meal_benefit, qr_status, status FROM clients`),
    db.execute(sql`SELECT id, event, message, created_at FROM notifications
                   WHERE created_at::date BETWEEN ${from} AND ${to}`),
    db.execute(sql`SELECT id, name, employee_id, email, department, meal_benefit, status, created_at
                   FROM account_requests`),
  ]);

  return {
    label,
    payload: {
      generatedAt: new Date().toISOString(),
      range: { from, to },
      orders, clients, notifications, accountRequests,
    },
  };
}

export async function buildTransactionCsvRows(kind: "daily" | "weekly" | "monthly") {
  const { from, to, label } = bounds(kind);
  const rows = await db.execute<Record<string, unknown>>(sql`
    SELECT o.created_at::text AS "Date", o.id AS "Order", o.client_name AS "Employee",
           COALESCE(string_agg(oi.qty || 'x ' || oi.name, '; ' ORDER BY oi.id), '') AS "Items",
           o.amount::text AS "Amount (Tk)", o.payment_method AS "Paid Via", o.status AS "Status"
    FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.order_date BETWEEN ${from} AND ${to}
    GROUP BY o.id ORDER BY o.created_at
  `);
  return { label, rows };
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}