import { useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { exportToExcel } from "../../../../components/utils/exportExcel";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import ShareButton from "../../../../components/shared/ShareButton";
import AvatarImage from "../../../../components/shared/AvatarImage";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";

const RANGES = [
  ["today", "Today"],
  ["month", "This Month"],
];

export default function ManagerReports() {
  const orders = useLiveCollection("orders", "orders.json");
  const [range, setRange] = useState("today");

  if (!orders) return <Loader full label="Loading reports..." />;

  const now = new Date();

  const inRange = orders.filter((o) => {
    const d = new Date(o.createdAt);

    if (range === "today") {
      return d.toDateString() === now.toDateString();
    }

    return (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });

  const dinerMap = {};

  inRange.forEach((o) => {
    if (!dinerMap[o.clientName]) {
      dinerMap[o.clientName] = {
        name: o.clientName,
        days: new Set(),
        total: 0,
        orders: 0,
      };
    }

    dinerMap[o.clientName].days.add(
      new Date(o.createdAt).toDateString()
    );

    dinerMap[o.clientName].total += o.amount;
    dinerMap[o.clientName].orders += 1;
  });

  const diners = Object.values(dinerMap)
    .map((d) => ({
      name: d.name,
      daysEaten: d.days.size,
      total: d.total,
      orders: d.orders,
    }))
    .sort((a, b) => b.total - a.total);

  const totalAmount = inRange.reduce((s, o) => s + o.amount, 0);

  const rangeLabel = RANGES.find(([k]) => k === range)[1];

  function downloadExcel() {
    exportToExcel(
      diners.map((d) => ({
        Employee: d.name,
        "Days Eaten": d.daysEaten,
        Orders: d.orders,
        "Total (Tk)": d.total,
      })),
      `who-ate-${range}-${now.toISOString().slice(0, 10)}`
    );
  }

  function printReport() {
    printOnLetterhead({
      title: `Who Ate — ${rangeLabel}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Who Ate — ${rangeLabel}</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">
          ${diners.length} diners · Tk ${totalAmount.toLocaleString()} total
        </p>

        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Days Eaten</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            ${diners
              .map(
                (d) => `
                  <tr>
                    <td>${d.name}</td>
                    <td>${d.daysEaten}</td>
                    <td>Tk ${d.total}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>

        <div class="row total">
          <span>Total</span>
          <span>Tk ${totalAmount.toLocaleString()}</span>
        </div>
      `,
    });
  }

  return (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden sm:space-y-6">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
            Who Ate — Reports
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-5 text-ink-400">
            How many employees ate and how much was deducted from salary.
          </p>
        </div>

      </div>

      {/* Range Selector */}
      <div className="flex w-full gap-1 rounded-lg bg-ink-50 p-1 sm:w-fit">
        {RANGES.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={`flex-1 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors sm:flex-none sm:py-2 ${
              range === key
                ? "bg-white text-brand-700 shadow-sm"
                : "text-ink-500 hover:text-ink-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Statistics */}
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <StatCard
          label="Diners"
          value={diners.length}
          accent="brand"
        />

        <StatCard
          label="Total Deducted"
          value={`Tk ${totalAmount.toLocaleString()}`}
          accent="amber"
        />
      </div>

      {/* Employee Breakdown */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">
          Employee Breakdown
        </h2>

        <div className="space-y-2">
          {diners.map((d) => (
            <div
              key={d.name}
              className="flex min-w-0 items-center gap-2 rounded-lg bg-ink-50 px-2.5 py-2.5 text-sm sm:gap-3 sm:px-3"
            >
              {/* Avatar */}
              <AvatarImage
                name={d.name}
                size={32}
                className="shrink-0"
              />

              {/* Employee Name */}
              <span className="min-w-0 flex-1 truncate font-medium text-ink-800">
                {d.name}
              </span>

              {/* Days */}
              <span className="hidden shrink-0 text-xs text-ink-400 sm:inline">
                {d.daysEaten} day(s)
              </span>

              {/* Amount */}
              <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-ink-900">
                Tk {d.total}
              </span>
            </div>
          ))}

          {diners.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-400">
              No orders in this range.
            </p>
          )}
        </div>
      </div>
      
      {/* Actions */}
        <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
          <button
            onClick={downloadExcel}
            className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold transition hover:bg-ink-50 sm:h-8 sm:px-2.5"
          >
            <FileSpreadsheet size={14} className="shrink-0" />
            <span>Excel</span>
          </button>

          <button
            onClick={printReport}
            className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold transition hover:bg-ink-50 sm:h-8 sm:px-2.5"
          >
            <Printer size={14} className="shrink-0" />
            <span>Print</span>
          </button>

        </div>
    </div>
  );
}