import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Download,
  Eye,
  FileText,
  RotateCcw,
  Utensils,
  Wallet,
} from "lucide-react";
import { printOnLetterhead } from "../utils/printLetterhead";
import { exportToExcel } from "../utils/exportExcel";
import StatCard from "./StatCard";
import Badge from "./Badge";
import Modal from "./Modal";
import Pagination, { usePagination } from "./Pagination";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Renders exactly the same Monthly Statement UI/logic that
 * ClientStatement.jsx uses for the logged-in client — but takes the
 * target client + their orders as props, so Manager/Super Admin can view
 * ANY client's statement in the identical shape.
 *
 * `onViewOrder(orderId)` lets the caller decide where the eye-icon should
 * navigate.
 *
 * `periodStorageKey` scopes the sessionStorage period-memory per viewer
 * context.
 */
export default function StatementView({
  client,
  orders,
  onViewOrder,
  periodStorageKey,
}) {
  const now = new Date();

  function readSavedPeriod() {
    try {
      const raw = sessionStorage.getItem(periodStorageKey);

      if (!raw) return null;

      const parsed = JSON.parse(raw);

      if (
        typeof parsed?.year === "number" &&
        typeof parsed?.month === "number"
      ) {
        return parsed;
      }
    } catch {}

    return null;
  }

  const saved = readSavedPeriod();

  const [year, setYear] = useState(
    saved?.year ?? now.getFullYear()
  );

  const [month, setMonth] = useState(
    saved?.month ?? now.getMonth()
  );

  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        periodStorageKey,
        JSON.stringify({ year, month })
      );
    } catch {}

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, periodStorageKey]);

  const myOrders = useMemo(
    () =>
      (orders || []).filter(
        (o) => !["cancelled", "rejected"].includes(o.status)
      ),
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
    () =>
      myOrders.filter((o) => {
        const d = new Date(o.createdAt);

        return (
          d.getFullYear() === year &&
          d.getMonth() === month
        );
      }),
    [myOrders, year, month]
  );

  const sorted = useMemo(
    () =>
      [...monthOrders].sort(
        (a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
      ),
    [monthOrders]
  );

  const totalAmount = useMemo(
    () =>
      monthOrders.reduce(
        (s, o) => s + Number(o.amount || 0),
        0
      ),
    [monthOrders]
  );

  const daysEaten = useMemo(
    () =>
      new Set(
        monthOrders.map(
          (o) => new Date(o.createdAt).toDateString()
        )
      ).size,
    [monthOrders]
  );

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedOrders,
  } = usePagination(sorted, 12);

  const monthLabel = `${MONTH_NAMES[month]} ${year}`;

  const isCurrentPeriod =
    year === now.getFullYear() &&
    month === now.getMonth();

  function downloadExcel() {
    exportToExcel(
      monthOrders.map((o) => ({
        Date: new Date(o.createdAt).toLocaleDateString(),
        Time: new Date(o.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        Order: o.id,
        Items: o.items
          ?.map((i) => `${i.qty}x ${i.name}`)
          .join(", "),
        "Amount (Tk)": o.amount,
        Status: o.status,
      })),
      `${client?.name || "statement"}-${year}-${String(
        month + 1
      ).padStart(2, "0")}`
    );
  }

  function printStatement() {
    printOnLetterhead({
      title: `Monthly Statement — ${monthLabel}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">
          Monthly Statement — ${monthLabel}
        </h2>

        <p style="color:#595959;font-size:13px;margin:0 0 20px">
          ${client?.name || ""} · ${client?.employeeId || ""}
        </p>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Order</th>
              <th>Items</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            ${monthOrders
              .map(
                (o) =>
                  `<tr>
                    <td>${new Date(
                      o.createdAt
                    ).toLocaleDateString()}</td>
                    <td>${o.id}</td>
                    <td>${(o.items || [])
                      .map(
                        (i) => `${i.qty}x ${i.name}`
                      )
                      .join(", ")}</td>
                    <td>Tk ${o.amount}</td>
                  </tr>`
              )
              .join("")}
          </tbody>
        </table>

        <div class="row">
          <span class="label">Days Eaten</span>
          <span>${daysEaten}</span>
        </div>

        <div class="row total">
          <span>Total Salary Deduction</span>
          <span>Tk ${totalAmount}</span>
        </div>
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
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden sm:space-y-6">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-ink-900 sm:text-xl">
            Monthly Statement
          </h2>

          <p className="mt-1 text-sm leading-5 text-ink-400">
            All meals and salary deductions for{" "}
            <span className="font-medium text-ink-600">
              {client?.name}
            </span>
            .
          </p>
        </div>

        {/* Actions */}
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <button
            onClick={printStatement}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2.5 text-xs font-semibold transition hover:bg-ink-50 sm:min-h-0 sm:py-2"
          >
            <FileText size={14} className="shrink-0" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={downloadExcel}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2.5 text-xs font-semibold transition hover:bg-ink-50 sm:min-h-0 sm:py-2"
          >
            <Download size={14} className="shrink-0" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Statement Period */}
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-3.5 text-left shadow-sm transition hover:border-brand-300 sm:w-auto sm:p-4"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Calendar size={18} />
            </span>

            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-400 sm:text-xs">
                Statement Period
              </span>

              <span className="block truncate text-sm font-bold text-ink-900 sm:text-base">
                {monthLabel}
              </span>
            </span>
          </span>

          <span className="shrink-0 text-xs font-semibold text-brand-600">
            Change
          </span>
        </button>

        {!isCurrentPeriod && (
          <button
            type="button"
            onClick={jumpToCurrentMonth}
            className="flex w-full min-h-10 items-center justify-center gap-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 sm:w-auto sm:min-h-0"
          >
            <RotateCcw size={13} />
            Current Month
          </button>
        )}
      </div>

      {/* Period Picker */}
      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select Period"
        size="sm"
      >
        <div className="min-w-0">
          {/* Year Selector */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setYear((y) =>
                  Math.max(MIN_YEAR, y - 1)
                )
              }
              disabled={year <= MIN_YEAR}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="text-lg font-bold text-ink-900">
              {year}
            </span>

            <button
              type="button"
              onClick={() =>
                setYear((y) =>
                  Math.min(MAX_YEAR, y + 1)
                )
              }
              disabled={year >= MAX_YEAR}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Months */}
          <div className="grid grid-cols-3 gap-2">
            {MONTH_NAMES.map((m, idx) => {
              const hasData = monthsWithData.has(
                `${year}-${idx}`
              );

              const isSelected = idx === month;

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => pickMonth(idx)}
                  className={`min-h-11 rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors ${
                    isSelected
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : hasData
                      ? "border-ink-200 text-ink-700 hover:border-brand-300"
                      : "border-ink-100 text-ink-400 hover:border-brand-200"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Statistics */}
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <StatCard
          label="Days Eaten"
          value={daysEaten}
          Icon={Utensils}
          accent="brand"
        />

        <StatCard
          label="Total Orders"
          value={monthOrders.length}
          Icon={FileText}
          accent="ink"
        />

        <StatCard
          label="Salary Deduction"
          value={`Tk ${totalAmount}`}
          Icon={Wallet}
          accent="amber"
        />

        <StatCard
          label="Avg per Meal"
          value={`Tk ${
            monthOrders.length
              ? Math.round(
                  totalAmount / monthOrders.length
                )
              : 0
          }`}
          accent="sky"
        />
      </div>

      {/* Order Details */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <div className="mb-3 flex min-w-0 flex-col gap-1">
          <h3 className="text-sm font-bold text-ink-700">
            {monthLabel} — Order & Deduction Details
          </h3>

          <p className="text-xs text-ink-400 sm:hidden">
            Swipe horizontally to view all details.
          </p>
        </div>

        {/* Responsive Table */}
        <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase text-ink-400">
              <tr>
                <th className="whitespace-nowrap py-2 pr-4">
                  Date
                </th>

                <th className="whitespace-nowrap py-2 pr-4">
                  Order
                </th>

                <th className="min-w-[180px] py-2 pr-4">
                  Items
                </th>

                <th className="whitespace-nowrap py-2 pr-4">
                  Status
                </th>

                <th className="whitespace-nowrap py-2 pr-4 text-right">
                  Deducted
                </th>

                <th className="whitespace-nowrap py-2 text-right">
                  Details
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {pagedOrders.map((o) => (
                <tr key={o.id} className="align-middle">
                  {/* Date */}
                  <td className="whitespace-nowrap py-2.5 pr-4 text-ink-500">
                    {new Date(
                      o.createdAt
                    ).toLocaleDateString()}
                  </td>

                  {/* Order ID */}
                  <td className="max-w-[150px] py-2.5 pr-4 font-medium text-ink-800">
                    <span className="block truncate">
                      {o.id}
                    </span>
                  </td>

                  {/* Items */}
                  <td className="max-w-[260px] py-2.5 pr-4 text-ink-500">
                    <span className="block break-words">
                      {o.items
                        ?.map(
                          (i) =>
                            `${i.qty}x ${i.name}`
                        )
                        .join(", ")}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap py-2.5 pr-4">
                    <Badge tone={o.status}>
                      {o.status}
                    </Badge>
                  </td>

                  {/* Amount */}
                  <td className="whitespace-nowrap py-2.5 pr-4 text-right font-semibold text-brand-600">
                    -Tk {o.amount}
                  </td>

                  {/* Details */}
                  <td className="py-2.5 text-right">
                    {onViewOrder && (
                      <button
                        type="button"
                        onClick={() =>
                          onViewOrder(o.id)
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-700"
                        aria-label={`View order ${o.id}`}
                      >
                        <Eye size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {monthOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm text-ink-400"
                  >
                    No orders in {monthLabel}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="overflow-x-auto">
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            className="px-1 pt-3"
          />
        </div>
      </div>
    </div>
  );
}