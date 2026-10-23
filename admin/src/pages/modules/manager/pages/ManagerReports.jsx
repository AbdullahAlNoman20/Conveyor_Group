// admin/src/pages/modules/manager/pages/ManagerReports.jsx
import { useEffect, useState } from "react";
import { Download, Printer, Users, Utensils, AlertTriangle, Wallet } from "lucide-react";
import { apiGet } from "../../../../components/services/api";
import { exportToExcel } from "../../../../components/utils/exportExcel";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import { useToast } from "../../../../components/hooks/useToast";
import DateRangePicker, { useDateRange } from "../../../../components/shared/DateRangePicker";
import StatCard from "../../../../components/shared/StatCard";
import AvatarImage from "../../../../components/shared/AvatarImage";
import Loader from "../../../../components/shared/Loader";

const tk = (v) => `Tk ${Number(v || 0).toLocaleString()}`;

export default function ManagerReports() {
  const { push } = useToast();
  const ctrl = useDateRange("day");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    apiGet(`/reports/who-ate/period?from=${ctrl.range.from}&to=${ctrl.range.to}`)
      .then((result) => mounted && setData(result))
      .catch(() => mounted && setData(null))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [ctrl.range.from, ctrl.range.to]);

  function downloadExcel() {
    if (!data?.people?.length) {
      push("Nothing to export for this period.", "error");
      return;
    }

    exportToExcel(
      data.people.map((p) => ({
        Employee: p.name,
        "Employee ID": p.employeeId || "",
        Department: p.department || "",
        Collected: p.collected,
        Missed: p.missed,
        Cancelled: p.cancelled,
        "Deducted (Tk)": p.amount,
      })),
      `who-ate-${data.from}-to-${data.to}`,
    );
  }

  function print() {
    if (!data) return;
    printOnLetterhead({
      title: `Who Ate, ${ctrl.label}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Who Ate</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${ctrl.label}</p>
        <table>
          <thead>
            <tr><th>Employee</th><th>ID</th><th>Collected</th><th>Missed</th><th>Cancelled</th><th>Deducted</th></tr>
          </thead>
          <tbody>
            ${data.people
              .map(
                (p) =>
                  `<tr><td>${p.name}</td><td>${p.employeeId || ""}</td><td>${p.collected}</td><td>${p.missed}</td><td>${p.cancelled}</td><td>Tk ${p.amount}</td></tr>`,
              )
              .join("")}
          </tbody>
        </table>
        <div class="row"><span class="label">Meals collected</span><span>${data.summary.meals}</span></div>
        <div class="row"><span class="label">Missed</span><span>${data.summary.missed}</span></div>
        <div class="row total"><span>Total deducted</span><span>Tk ${data.summary.amount}</span></div>
      `,
    });
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Who Ate</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">
          Who took a meal, who missed it, and what was deducted. Pick any day,
          month or year.
        </p>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <DateRangePicker ctrl={ctrl} />

        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button
            onClick={print}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold transition hover:bg-ink-50"
          >
            <Printer size={14} /> Print
          </button>
          <button
            onClick={downloadExcel}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold transition hover:bg-ink-50"
          >
            <Download size={14} /> Excel
          </button>
        </div>
      </div>

      {loading ? (
        <Loader label="Loading..." />
      ) : !data || data.people.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
          Nothing recorded for {ctrl.label}.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
            <StatCard label="Meals Collected" value={data.summary.meals} Icon={Utensils} accent="brand" />
            <StatCard label="People" value={data.summary.people} Icon={Users} accent="ink" />
            <StatCard
              label="Missed"
              value={data.summary.missed}
              Icon={AlertTriangle}
              accent={data.summary.missed > 0 ? "amber" : "emerald"}
            />
            <StatCard label="Total Deducted" value={tk(data.summary.amount)} Icon={Wallet} accent="emerald" />
          </div>

          {/* Desktop table */}
          <div className="hidden w-full overflow-x-auto rounded-xl border border-ink-100 bg-white sm:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase text-ink-400">
                <tr>
                  <th className="px-3 py-2.5">Employee</th>
                  <th className="px-3 py-2.5">Department</th>
                  <th className="px-3 py-2.5 text-right">Collected</th>
                  <th className="px-3 py-2.5 text-right">Missed</th>
                  <th className="px-3 py-2.5 text-right">Cancelled</th>
                  <th className="px-3 py-2.5 text-right">Deducted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.people.map((p) => (
                  <tr key={p.clientId}>
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <AvatarImage name={p.name} size={28} className="shrink-0" />
                        <span className="min-w-0 truncate font-medium text-ink-800">{p.name}</span>
                      </div>
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-2.5 text-ink-500">
                      {p.department || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-600">
                      {p.collected}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-semibold ${
                        p.missed > 0 ? "text-amber-600" : "text-ink-400"
                      }`}
                    >
                      {p.missed}
                    </td>
                    <td className="px-3 py-2.5 text-right text-ink-500">{p.cancelled}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-ink-900">
                      {tk(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {data.people.map((p) => (
              <div key={p.clientId} className="rounded-xl border border-ink-100 bg-white p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <AvatarImage name={p.name} size={34} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{p.name}</p>
                    <p className="truncate text-xs text-ink-400">{p.department || "—"}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-ink-900">{tk(p.amount)}</span>
                </div>

                <div className="mt-2 flex gap-3 text-xs">
                  <span className="text-emerald-600">{p.collected} collected</span>
                  {p.missed > 0 && <span className="text-amber-600">{p.missed} missed</span>}
                  {p.cancelled > 0 && <span className="text-ink-400">{p.cancelled} cancelled</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}