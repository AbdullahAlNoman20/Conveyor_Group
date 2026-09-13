// admin/src/pages/modules/client/pages/ClientStatement.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Wallet,
  Utensils,
  RotateCcw,
  CalendarX,
  AlertTriangle,
} from "lucide-react";
import { apiGet } from "../../../../components/services/api";
import { dataStore } from "../../../../components/services/dataStore";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import { exportToExcel } from "../../../../components/utils/exportExcel";
import StatCard from "../../../../components/shared/StatCard";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Modal from "../../../../components/shared/Modal";
import Pagination, {
  usePagination,
} from "../../../../components/shared/Pagination";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// A statement line is one of three daily outcomes, not an order status.
const STATUS_TEXT = {
  collected: "collected",
  no_show: "missed",
  cancelled: "cancelled",
};

const BADGE_TONE = {
  collected: "active",
  no_show: "pending",
  cancelled: "cancelled",
};

// Persisted for the tab's session only
const PERIOD_KEY = "cccms:statement-period";

function readSavedPeriod() {
  try {
    const raw = sessionStorage.getItem(PERIOD_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (typeof parsed?.year === "number" && typeof parsed?.month === "number") {
      return parsed;
    }
  } catch {}

  return null;
}

function savePeriod(year, month) {
  try {
    sessionStorage.setItem(PERIOD_KEY, JSON.stringify({ year, month }));
  } catch {}
}

export default function ClientStatement() {
  const navigate = useNavigate();

  const now = new Date();
  const saved = readSavedPeriod();

  const [year, setYear] = useState(saved?.year ?? now.getFullYear());
  const [month, setMonth] = useState(saved?.month ?? now.getMonth());
  const [pickerOpen, setPickerOpen] = useState(false);

  /**
   * The statement is served whole by the API rather than filtered from the
   * orders collection: a meal that was cooked and never collected is charged
   * without ever producing an order row, so orders alone would undercount the
   * total against the balance shown on the dashboard.
   */
  const [statement, setStatement] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    savePeriod(year, month);
  }, [year, month]);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      try {
        const data = await apiGet(`/clients/me/statement?year=${year}&month=${month}`);
        if (!mounted) return;
        setStatement(data);
        setLoadError("");
      } catch (err) {
        if (!mounted) return;
        setLoadError(err?.message || "Couldn't load your statement.");
      }
    }

    refresh();

    // A new order or the nightly no-show sweep both change this month's lines.
    const unsubOrders = dataStore.subscribe("orders", refresh);
    const unsubAttendance = dataStore.subscribe("attendance", refresh);

    return () => {
      mounted = false;
      unsubOrders();
      unsubAttendance();
    };
  }, [year, month]);

  const monthsWithData = useMemo(
    () => new Set(statement?.monthsWithData ?? []),
    [statement],
  );

  const sorted = useMemo(() => statement?.entries ?? [], [statement]);

  const totalAmount = statement?.totalAmount ?? 0;
  const daysEaten = statement?.daysEaten ?? 0;
  const noShowCount = statement?.noShowCount ?? 0;
  const noShowTotal = statement?.noShowTotal ?? 0;
  const cancelledCount = statement?.cancelledCount ?? 0;

  const MIN_YEAR = now.getFullYear() - 5;
  const MAX_YEAR = now.getFullYear() + 1;

  const { page, setPage, totalPages, pageItems: pagedEntries } = usePagination(sorted, 12);

  const monthLabel = `${MONTH_NAMES[month]} ${year}`;
  const isCurrentPeriod = year === now.getFullYear() && month === now.getMonth();

  if (!statement && !loadError) {
    return <Loader full label="Loading your statement..." />;
  }

  function downloadExcel() {
    exportToExcel(
      sorted.map((e) => ({
        Date: new Date(e.date).toLocaleDateString(),
        Type: e.label,
        Meal: e.items || "—",
        "Amount (Tk)": e.amount,
        Reference: e.orderId || "—",
      })),
      `statement-${year}-${String(month + 1).padStart(2, "0")}`,
    );
  }

  function printStatement() {
    printOnLetterhead({
      title: `Monthly Statement — ${monthLabel}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Monthly Statement — ${monthLabel}</h2>

        <table>
          <thead>
            <tr><th>Date</th><th>Type</th><th>Meal</th><th>Amount</th></tr>
          </thead>
          <tbody>
            ${sorted
              .map(
                (e) =>
                  `<tr>
                    <td>${new Date(e.date).toLocaleDateString()}</td>
                    <td>${e.label}</td>
                    <td>${e.items || "—"}</td>
                    <td>Tk ${e.amount}</td>
                  </tr>`,
              )
              .join("")}
          </tbody>
        </table>

        <div class="row">
          <span class="label">Meals Collected</span>
          <span>${daysEaten}</span>
        </div>

        <div class="row">
          <span class="label">Cancelled in Time (not charged)</span>
          <span>${cancelledCount}</span>
        </div>

        <div class="row">
          <span class="label">Missed Without Cancelling</span>
          <span>${noShowCount} &nbsp;·&nbsp; Tk ${noShowTotal}</span>
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
      <div className="flex w-full min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight text-ink-900 sm:text-2xl">
            Monthly Statement
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-400 sm:text-sm">
            Every meal you collected, cancelled, or missed — and what was
            deducted for each.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <button
            onClick={printStatement}
            className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold transition hover:bg-ink-50 active:scale-[0.98] sm:w-auto"
          >
            <FileText size={14} className="shrink-0" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={downloadExcel}
            className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold transition hover:bg-ink-50 active:scale-[0.98] sm:w-auto"
          >
            <Download size={14} className="shrink-0" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {loadError && (
        <p className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
          {loadError}
        </p>
      )}

      {/* Period selector */}
      <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex min-h-[68px] w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-3.5 text-left shadow-sm transition hover:border-brand-300 active:scale-[0.995] sm:w-auto sm:min-w-[280px] sm:p-4"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Calendar size={18} />
            </span>

            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-400 sm:text-xs">
                Statement Period
              </span>
              <span className="block truncate text-sm font-bold text-ink-900 sm:text-base">
                {monthLabel}
              </span>
            </span>
          </span>

          <span className="shrink-0 text-xs font-semibold text-brand-600">Change</span>
        </button>

        {!isCurrentPeriod && (
          <button
            type="button"
            onClick={jumpToCurrentMonth}
            className="flex min-h-[40px] w-full items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-ink-50 sm:w-auto"
          >
            <RotateCcw size={13} />
            Current Month
          </button>
        )}
      </div>

      {/* Period picker */}
      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select Period"
        size="sm"
      >
        <div className="w-full min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => setYear((y) => Math.max(MIN_YEAR, y - 1))}
              disabled={year <= MIN_YEAR}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="px-2 text-lg font-bold text-ink-900">{year}</span>

            <button
              onClick={() => setYear((y) => Math.min(MAX_YEAR, y + 1))}
              disabled={year >= MAX_YEAR}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 disabled:opacity-30"
            >
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
                  className={`min-h-[42px] rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors ${
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

          <p className="mt-3 text-center text-[10px] leading-4 text-ink-400 sm:text-[11px]">
            Any month can be opened, even ones with no activity yet.
          </p>
        </div>
      </Modal>

      {/* Stats */}
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Meals Collected"
          value={daysEaten}
          Icon={Utensils}
          accent="brand"
        />

        <StatCard
          label="Cancelled in Time"
          value={cancelledCount}
          Icon={CalendarX}
          accent="ink"
          trend="Not charged"
        />

        <StatCard
          label="Missed Without Cancelling"
          value={noShowCount}
          Icon={AlertTriangle}
          accent="amber"
          trend={`Tk ${noShowTotal} charged`}
        />

        <StatCard
          label="Total Salary Deduction"
          value={`Tk ${totalAmount}`}
          Icon={Wallet}
          accent="brand"
        />
      </div>

      {noShowCount > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
          Tk {noShowTotal} of this month's deduction is for {noShowCount} meal
          {noShowCount === 1 ? "" : "s"} that were cooked for you but not
          collected. Cancel before 6:00 AM on any day you won't be eating.
        </p>
      )}

      {/* Ledger */}
      <div className="w-full min-w-0 overflow-hidden rounded-xl border border-ink-100 bg-white p-3.5 sm:p-5">
        <h2 className="mb-3 break-words text-sm font-bold leading-5 text-ink-700 sm:text-base">
          {monthLabel} — Daily Meal Record
        </h2>

        {/* Desktop table */}
        <div className="hidden w-full min-w-0 overflow-x-auto sm:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase text-ink-400">
              <tr>
                <th className="whitespace-nowrap py-2">Date</th>
                <th className="whitespace-nowrap py-2">Type</th>
                <th className="py-2">Meal</th>
                <th className="whitespace-nowrap py-2">Status</th>
                <th className="whitespace-nowrap py-2 text-right">Deducted</th>
                <th className="whitespace-nowrap py-2 text-right">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {pagedEntries.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap py-2 text-ink-500">
                    {new Date(e.date).toLocaleDateString()}
                  </td>

                  <td className="whitespace-nowrap py-2 font-medium text-ink-800">
                    {e.label}
                  </td>

                  <td className="max-w-[300px] py-2 text-ink-500">
                    <span className="block truncate">{e.items || "—"}</span>
                  </td>

                  <td className="whitespace-nowrap py-2">
                    <Badge tone={BADGE_TONE[e.kind]}>{STATUS_TEXT[e.kind]}</Badge>
                  </td>

                  <td
                    className={`whitespace-nowrap py-2 text-right font-semibold ${
                      e.amount > 0 ? "text-brand-600" : "text-ink-400"
                    }`}
                  >
                    {e.amount > 0 ? `-Tk ${e.amount}` : "Tk 0"}
                  </td>

                  <td className="whitespace-nowrap py-2 text-right">
                    {/* A missed meal has no order to open. */}
                    {e.orderId && (
                      <button
                        onClick={() => navigate(`/app/client/orders/${e.orderId}`)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-ink-400">
                    No meal activity in {monthLabel}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="w-full min-w-0 space-y-3 sm:hidden">
          {pagedEntries.map((e) => (
            <button
              key={e.id}
              onClick={() => e.orderId && navigate(`/app/client/orders/${e.orderId}`)}
              disabled={!e.orderId}
              className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-ink-100 bg-ink-50/60 p-3 text-left transition hover:border-ink-200 active:scale-[0.995] disabled:cursor-default disabled:active:scale-100"
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-ink-900">
                    {e.label}
                  </p>
                  <div className="shrink-0">
                    <Badge tone={BADGE_TONE[e.kind]}>{STATUS_TEXT[e.kind]}</Badge>
                  </div>
                </div>

                <p className="mt-1 truncate text-xs text-ink-400">{e.items || "—"}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {new Date(e.date).toLocaleDateString()}
                </p>
              </div>

              <p
                className={`shrink-0 whitespace-nowrap text-sm font-bold ${
                  e.amount > 0 ? "text-brand-600" : "text-ink-400"
                }`}
              >
                {e.amount > 0 ? `-Tk ${e.amount}` : "Tk 0"}
              </p>
            </button>
          ))}

          {sorted.length === 0 && (
            <p className="rounded-xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400 sm:p-8">
              No meal activity in {monthLabel}.
            </p>
          )}
        </div>

        <div className="w-full min-w-0 overflow-x-auto">
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            className="px-0 pt-3 sm:px-1"
          />
        </div>
      </div>
    </div>
  );
}