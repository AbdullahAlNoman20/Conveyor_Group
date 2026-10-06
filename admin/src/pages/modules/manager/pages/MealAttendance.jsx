// admin/src/pages/modules/manager/pages/MealAttendance.jsx
import { useEffect, useState } from "react";
import { Download, Printer, Utensils, CalendarX, AlertTriangle, Clock } from "lucide-react";
import { apiGet } from "../../../../components/services/api";
import { dataStore } from "../../../../components/services/dataStore";
import { exportToExcel } from "../../../../components/utils/exportExcel";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import StatCard from "../../../../components/shared/StatCard";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import AvatarImage from "../../../../components/shared/AvatarImage";

const STATUS_LABEL = {
  collected: "Took meal",
  cancelled: "Cancelled",
  no_show: "Missed",
  pending: "Not yet",
};

const STATUS_TONE = {
  collected: "active",
  cancelled: "cancelled",
  no_show: "pending",
  pending: "expired",
};

export default function MealAttendance() {
  const [date, setDate] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      try {
        const query = date ? `?date=${date}` : "";
        const result = await apiGet(`/attendance/daily${query}`);
        if (mounted) setData(result);
      } catch {
        /* keep the last good render */
      } finally {
        if (mounted) setLoading(false);
      }
    }

    refresh();
    // Pushed whenever someone cancels or collects — no polling.
    const unsubscribe = dataStore.subscribe("attendance", refresh);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [date]);

  if (loading) return <Loader full label="Loading attendance..." />;
  if (!data) return null;

  const { summary, entries } = data;

  function downloadExcel() {
    exportToExcel(
      entries.map((e) => ({
        Employee: e.name,
        "Employee ID": e.employeeId || "-",
        Department: e.department || "-",
        Status: STATUS_LABEL[e.status],
        "Deducted (Tk)": e.amount,
      })),
      `meal-attendance-${data.date}`,
    );
  }

  function printRegister() {
    printOnLetterhead({
      title: `Meal Attendance — ${data.date}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Daily Meal Attendance — ${data.date}</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">
          Took meal: ${summary.collected} · Cancelled: ${summary.cancelled} · Missed: ${summary.noShow}
        </p>
        <table>
          <thead><tr><th>Employee</th><th>ID</th><th>Status</th><th>Deducted</th></tr></thead>
          <tbody>
            ${entries
              .map(
                (e) =>
                  `<tr><td>${e.name}</td><td>${e.employeeId || "-"}</td><td>${STATUS_LABEL[e.status]}</td><td>Tk ${e.amount}</td></tr>`,
              )
              .join("")}
          </tbody>
        </table>
        <div class="row total"><span>Total Deducted</span><span>Tk ${summary.chargedAmount}</span></div>
      `,
    });
  }

  return (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden sm:space-y-6">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
            Daily Meal Attendance
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            Who took the meal, who cancelled before {data.cutoffLabel}, and who
            was charged for missing it.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <button
            onClick={printRegister}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold transition hover:bg-ink-50"
          >
            <Printer size={14} className="shrink-0" /> Print
          </button>
          <button
            onClick={downloadExcel}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold transition hover:bg-ink-50"
          >
            <Download size={14} className="shrink-0" /> Excel
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="att-date" className="text-xs font-semibold text-ink-500">
          Date
        </label>
        <input
          id="att-date"
          type="date"
          value={date || data.date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        {data.cancellationOpen && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-700">
            <Clock size={12} /> Cancellations still open until {data.cutoffLabel}
          </span>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <StatCard label="Took Meal" value={summary.collected}  accent="emerald" />
        <StatCard label="Cancelled" value={summary.cancelled}  accent="ink" />
        <StatCard label="Missed (charged)" value={summary.noShow}  accent="amber" />
        <StatCard label="Total Deducted" value={`Tk ${summary.chargedAmount}`} accent="brand" />
      </div>

      {summary.pending > 0 && (
        <p className="rounded-lg bg-ink-50 px-3 py-2.5 text-xs leading-5 text-ink-500">
          {summary.pending} employee(s) haven't collected or cancelled yet.
          They'll be marked as missed and charged automatically tonight.
        </p>
      )}

      <div className="min-w-0 overflow-hidden rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">
          Employee Register ({entries.length})
        </h2>

        <div className="space-y-2">
          {entries.map((e) => (
            <div
              key={e.clientId}
              className="flex min-w-0 items-center gap-2 rounded-lg bg-ink-50 px-2.5 py-2.5 text-sm sm:gap-3 sm:px-3"
            >
              <AvatarImage name={e.name} size={32} className="shrink-0" />

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-800">{e.name}</p>
                <p className="truncate text-xs text-ink-400">
                  {e.employeeId || "-"} · {e.department || "-"}
                </p>
              </div>

              <div className="shrink-0">
                <Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Badge>
              </div>

              <span
                className={`w-16 shrink-0 whitespace-nowrap text-right text-sm font-semibold ${
                  e.amount > 0 ? "text-brand-600" : "text-ink-400"
                }`}
              >
                Tk {e.amount}
              </span>
            </div>
          ))}

          {entries.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-400">
              No Fixed-Meal employees on record.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}