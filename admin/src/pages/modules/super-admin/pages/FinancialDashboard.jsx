import { Banknote, Users, Download, Printer } from "lucide-react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import DateRangeFilter, { useDateRangeFilter } from "../../../../components/shared/DateRangeFilter";
import { exportToExcel } from "../../../../components/utils/exportExcel";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import ShareButton from "../../../../components/shared/ShareButton";
import AvatarImage from "../../../../components/shared/AvatarImage";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";

function inRange(dateStr, from, to) {
  const d = new Date(dateStr);
  return d >= from && d <= to;
}

export default function FinancialDashboard() {
  const orders = useLiveCollection("orders", "orders.json");
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range } =
    useDateRangeFilter("This Month");

  if (!orders) return <Loader full label="Loading salary summary..." />;

  const ordersInRange = orders.filter((o) => inRange(o.createdAt, range.from, range.to));

  const clientSummaryMap = {};
  ordersInRange.forEach((o) => {
    const key = o.clientName;
    if (!clientSummaryMap[key]) clientSummaryMap[key] = { name: key, days: new Set(), total: 0 };
    clientSummaryMap[key].days.add(new Date(o.createdAt).toDateString());
    clientSummaryMap[key].total += o.amount;
  });
  const clientSummary = Object.values(clientSummaryMap)
    .map((c) => ({ name: c.name, daysEaten: c.days.size, total: c.total }))
    .sort((a, b) => b.total - a.total);

  const totalDiners = clientSummary.length;
  const totalAmount = ordersInRange.reduce((s, o) => s + o.amount, 0);

  function downloadPayrollSummary() {
    exportToExcel(
      clientSummary.map((c) => ({ "Employee Name": c.name, "Days Eaten": c.daysEaten, "Total Amount (Tk)": c.total })),
      `salary-deduction-summary-${range.from.toISOString().slice(0, 10)}_to_${range.to.toISOString().slice(0, 10)}`
    );
  }

  function printSummary() {
    printOnLetterhead({
      title: "Salary Deduction Summary",
      bodyHtml: `
        <h2 style="margin:0 0 4px">Salary Deduction Summary</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${range.from.toLocaleDateString()} — ${range.to.toLocaleDateString()}</p>
        <table>
          <thead><tr><th>Employee</th><th>Days Eaten</th><th>Amount</th></tr></thead>
          <tbody>${clientSummary.map((c) => `<tr><td>${c.name}</td><td>${c.daysEaten}</td><td>Tk ${c.total}</td></tr>`).join("")}</tbody>
        </table>
        <div class="row total"><span>Total</span><span>Tk ${totalAmount.toLocaleString()}</span></div>
      `,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Salary Deduction Summary</h1>
          <p className="text-sm text-ink-400">Who ate, how many days, how much — for HR payroll.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadPayrollSummary} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold hover:bg-ink-50">
            <Download size={14} /> Excel
          </button>
          <button onClick={printSummary} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold hover:bg-ink-50">
            <Printer size={14} /> Print
          </button>
          <ShareButton title="Salary Deduction Summary" text={`${totalDiners} diners, Tk ${totalAmount} total`} />
        </div>
      </div>

      <DateRangeFilter
        preset={preset}
        setPreset={setPreset}
        customFrom={customFrom}
        setCustomFrom={setCustomFrom}
        customTo={customTo}
        setCustomTo={setCustomTo}
        range={range}
      />

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Diners" value={totalDiners} Icon={Users} accent="sky" />
        <StatCard label="Total Deducted" value={`Tk ${totalAmount.toLocaleString()}`} Icon={Banknote} accent="brand" />
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Per-Employee Summary</h2>
        <div className="space-y-2">
          {clientSummary.map((c) => (
            <div key={c.name} className="flex items-center gap-3 rounded-lg bg-ink-50 px-3 py-2.5 text-sm">
              <AvatarImage name={c.name} size={32} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate font-medium text-ink-800">{c.name}</span>
              <span className="hidden text-ink-500 sm:inline">{c.daysEaten} day(s)</span>
              <span className="font-semibold text-ink-900">Tk {c.total.toLocaleString()}</span>
            </div>
          ))}
          {clientSummary.length === 0 && <p className="py-8 text-center text-sm text-ink-400">No orders in this range.</p>}
        </div>
      </div>
    </div>
  );
}