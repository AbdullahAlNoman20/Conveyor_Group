// FILE: src/components/shared/StatementView.jsx (NEW — the exact same statement view, reusable for Client/Manager/Super Admin)
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Download, Eye, FileText, RotateCcw, Utensils, Wallet } from "lucide-react";
import { printOnLetterhead } from "../utils/printLetterhead";
import { exportToExcel } from "../utils/exportExcel";
import StatCard from "./StatCard";
import Badge from "./Badge";
import Modal from "./Modal";
import Pagination, { usePagination } from "./Pagination";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Renders exactly the same Monthly Statement UI/logic that
 * ClientStatement.jsx uses for the logged-in client — but takes the
 * target client + their orders as props, so Manager/Super Admin can view
 * ANY client's statement in the identical shape (SRS correction #5:
 * "যা যা যেভাবে যেভাবে দেখা যাচ্ছে... সেম ভাবে এটা দেখতে পারবে").
 *
 * `onViewOrder(orderId)` lets the caller decide where the eye-icon should
 * navigate (Client goes to its own /app/client/orders/:id; Manager/Super
 * Admin will want their own equivalent detail route).
 * `periodStorageKey` scopes the sessionStorage period-memory per viewer
 * context, so a Manager browsing Client A's statement doesn't clobber
 * their own place in Client B's statement.
 */
export default function StatementView({ client, orders, onViewOrder, periodStorageKey }) {
  const now = new Date();

  function readSavedPeriod() {
    try {
      const raw = sessionStorage.getItem(periodStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.year === "number" && typeof parsed?.month === "number") return parsed;
    } catch {}
    return null;
  }

  const saved = readSavedPeriod();
  const [year, setYear] = useState(saved?.year ?? now.getFullYear());
  const [month, setMonth] = useState(saved?.month ?? now.getMonth());
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(periodStorageKey, JSON.stringify({ year, month }));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, periodStorageKey]);

  const myOrders = useMemo(
    () => (orders || []).filter((o) => !["cancelled", "rejected"].includes(o.status)),
    [orders]
  );

  const monthsWithData = useMemo(() => {
    const set = new Set();
    myOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      set.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    return set;
  }, [myOrders]);

  const MIN_YEAR = now.getFullYear() - 5;
  const MAX_YEAR = now.getFullYear() + 1;

  const monthOrders = useMemo(
    () => myOrders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === year && d.getMonth() === month;
    }),
    [myOrders, year, month]
  );

  const sorted = useMemo(() => [...monthOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [monthOrders]);
  const totalAmount = useMemo(() => monthOrders.reduce((s, o) => s + Number(o.amount || 0), 0), [monthOrders]);
  const daysEaten = useMemo(() => new Set(monthOrders.map((o) => new Date(o.createdAt).toDateString())).size, [monthOrders]);

  const { page, setPage, totalPages, pageItems: pagedOrders } = usePagination(sorted, 12);

  const monthLabel = `${MONTH_NAMES[month]} ${year}`;
  const isCurrentPeriod = year === now.getFullYear() && month === now.getMonth();

  function downloadExcel() {
    exportToExcel(
      monthOrders.map((o) => ({
        Date: new Date(o.createdAt).toLocaleDateString(),
        Time: new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        Order: o.id,
        Items: o.items?.map((i) => `${i.qty}x ${i.name}`).join(", "),
        "Amount (Tk)": o.amount,
        Status: o.status,
      })),
      `${client?.name || "statement"}-${year}-${String(month + 1).padStart(2, "0")}`
    );
  }

  function printStatement() {
    printOnLetterhead({
      title: `Monthly Statement — ${monthLabel}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Monthly Statement — ${monthLabel}</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${client?.name || ""} · ${client?.employeeId || ""}</p>
        <table>
          <thead><tr><th>Date</th><th>Order</th><th>Items</th><th>Amount</th></tr></thead>
          <tbody>
            ${monthOrders
              .map(
                (o) =>
                  `<tr><td>${new Date(o.createdAt).toLocaleDateString()}</td><td>${o.id}</td><td>${(o.items || [])
                    .map((i) => `${i.qty}x ${i.name}`)
                    .join(", ")}</td><td>Tk ${o.amount}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
        <div class="row"><span class="label">Days Eaten</span><span>${daysEaten}</span></div>
        <div class="row total"><span>Total Salary Deduction</span><span>Tk ${totalAmount}</span></div>
      `,
    });
  }

  function pickMonth(idx) {
    setMonth(idx);
    setPage(1);
    setPickerOpen(false);
  }
  function jumpToCurrentMonth() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Monthly Statement</h2>
          <p className="text-sm text-ink-400">All meals and salary deductions for {client?.name}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={printStatement} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold hover:bg-ink-50">
            <FileText size={14} /> Print / PDF
          </button>
          <button onClick={downloadExcel} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold hover:bg-ink-50">
            <Download size={14} /> Excel
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 sm:flex-none sm:w-auto"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Calendar size={18} />
            </span>
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-ink-400">Statement Period</span>
              <span className="block text-base font-bold text-ink-900">{monthLabel}</span>
            </span>
          </span>
          <span className="text-xs font-semibold text-brand-600">Change</span>
        </button>
        {!isCurrentPeriod && (
          <button
            type="button"
            onClick={jumpToCurrentMonth}
            className="flex items-center gap-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-50"
          >
            <RotateCcw size={13} /> Current Month
          </button>
        )}
      </div>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Select Period" size="sm">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => setYear((y) => Math.max(MIN_YEAR, y - 1))} disabled={year <= MIN_YEAR} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 disabled:opacity-30">
              <ChevronLeft size={18} />
            </button>
            <span className="text-lg font-bold text-ink-900">{year}</span>
            <button onClick={() => setYear((y) => Math.min(MAX_YEAR, y + 1))} disabled={year >= MAX_YEAR} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 disabled:opacity-30">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MONTH_NAMES.map((m, idx) => {
              const hasData = monthsWithData.has(`${year}-${idx}`);
              const isSelected = idx === month;
              return (
                <button
                  key={m}
                  onClick={() => pickMonth(idx)}
                  className={`rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors ${
                    isSelected ? "border-brand-500 bg-brand-50 text-brand-700" : hasData ? "border-ink-200 text-ink-700 hover:border-brand-300" : "border-ink-100 text-ink-400 hover:border-brand-200"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Days Eaten" value={daysEaten} Icon={Utensils} accent="brand" />
        <StatCard label="Total Orders" value={monthOrders.length} Icon={FileText} accent="ink" />
        <StatCard label="Salary Deduction" value={`Tk ${totalAmount}`} Icon={Wallet} accent="amber" />
        <StatCard label="Avg per Meal" value={`Tk ${monthOrders.length ? Math.round(totalAmount / monthOrders.length) : 0}`} accent="sky" />
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-bold text-ink-700">{monthLabel} — Order & Deduction Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-ink-400">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2">Order</th>
                <th className="py-2">Items</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Deducted</th>
                <th className="py-2 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {pagedOrders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2 text-ink-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="py-2 font-medium text-ink-800">{o.id}</td>
                  <td className="py-2 text-ink-500">{o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}</td>
                  <td className="py-2">
                    <Badge tone={o.status}>{o.status}</Badge>
                  </td>
                  <td className="py-2 text-right font-semibold text-brand-600">-Tk {o.amount}</td>
                  <td className="py-2 text-right">
                    {onViewOrder && (
                      <button onClick={() => onViewOrder(o.id)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100">
                        <Eye size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {monthOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-ink-400">No orders in {monthLabel}.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-1 pt-3" />
      </div>
    </div>
  );
}