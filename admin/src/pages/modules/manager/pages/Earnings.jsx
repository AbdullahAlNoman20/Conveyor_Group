// FILE: src/pages/modules/manager/pages/Earnings.jsx (FIXED — all hooks called before the loading early-return)
import { useState } from "react";
import { TrendingUp, Wallet, Banknote, Printer, Download } from "lucide-react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import { exportToExcel } from "../../../../components/utils/exportExcel";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

const RANGES = [
  ["today", "Today"],
  ["month", "This Month"],
];

export default function Earnings() {
  const transactions = useLiveCollection("walletTransactions", "wallet-transactions.json");
  const clients = useLiveCollection("clients", "clients.json");
  const [range, setRange] = useState("today");

  // IMPORTANT: every hook — including the useState hidden inside
  // usePagination() — must run on EVERY render, before any conditional
  // "loading" return below. Falling back to `[]` while data is still
  // loading keeps the hook count identical between the loading render and
  // the loaded render (same pattern already used in ScanQR.jsx).
  const todayISO = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const earningRows = (transactions || []).filter((t) => t.source === "recharge" || t.source === "order");

  const inRange = earningRows.filter((t) => {
    if (range === "today") return t.date === todayISO;
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const cashRecharge = inRange.filter((t) => t.source === "recharge").reduce((s, t) => s + t.amount, 0);
  const walletOrders = inRange
    .filter((t) => t.source === "order" && t.paymentMethod === "wallet")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const salaryOrders = inRange
    .filter((t) => t.source === "order" && t.paymentMethod === "salary")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const total = cashRecharge + walletOrders + salaryOrders;

  const sorted = [...inRange].sort((a, b) => new Date(b.date) - new Date(a.date));
  const { page, setPage, totalPages, pageItems: pagedRows } = usePagination(sorted, 15);

  const clientsList = clients || [];

  if (!transactions || !clients) return <Loader full label="Loading earnings..." />;

  function clientName(t) {
    return (
      t.clientLabel ||
      clientsList.find((c) => c.id === t.clientId)?.name ||
      t.clientId ||
      "—"
    );
  }
  function sourceLabel(t) {
    if (t.source === "recharge") return "Cash Recharge";
    return t.paymentMethod === "salary" ? "Order (Salary)" : "Order (Wallet)";
  }

  function printReport() {
    printOnLetterhead({
      title: `Earnings — ${RANGES.find(([k]) => k === range)[1]}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Restaurant Earnings — ${RANGES.find(([k]) => k === range)[1]}</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">Generated ${new Date().toLocaleString()}</p>
        <div class="row"><span class="label">Cash Recharges</span><span>Tk ${cashRecharge.toLocaleString()}</span></div>
        <div class="row"><span class="label">Order Payments — Wallet</span><span>Tk ${walletOrders.toLocaleString()}</span></div>
        <div class="row"><span class="label">Order Payments — Salary</span><span>Tk ${salaryOrders.toLocaleString()}</span></div>
        <table>
          <thead><tr><th>Date</th><th>Client</th><th>Source</th><th>Amount</th></tr></thead>
          <tbody>
            ${inRange
              .map((t) => `<tr><td>${t.date}</td><td>${clientName(t)}</td><td>${sourceLabel(t)}</td><td>Tk ${Math.abs(t.amount)}</td></tr>`)
              .join("")}
          </tbody>
        </table>
        <div class="row total"><span>Total Earning</span><span>Tk ${total.toLocaleString()}</span></div>
      `,
    });
  }

  function downloadExcel() {
    exportToExcel(
      inRange.map((t) => ({
        Date: t.date,
        Client: clientName(t),
        Source: sourceLabel(t),
        "Amount (Tk)": Math.abs(t.amount),
      })),
      `restaurant-earnings-${range}-${todayISO}`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Restaurant Earnings</h1>
          <p className="text-sm text-ink-400">Cash recharges + order payments collected on approval.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadExcel} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold hover:bg-ink-50">
            <Download size={14} /> Excel
          </button>
          <button onClick={printReport} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-ink-50 p-1 sm:w-fit">
        {RANGES.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${
              range === key ? "bg-white text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Earning" value={`Tk ${total.toLocaleString()}`} Icon={TrendingUp} accent="brand" />
        <StatCard label="Cash Recharges" value={`Tk ${cashRecharge.toLocaleString()}`} Icon={Banknote} accent="emerald" />
        <StatCard label="Order — Wallet" value={`Tk ${walletOrders.toLocaleString()}`} Icon={Wallet} accent="amber" />
        <StatCard label="Order — Salary" value={`Tk ${salaryOrders.toLocaleString()}`} Icon={Wallet} accent="ink" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-400">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {pagedRows.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 text-ink-500">{t.date}</td>
                <td className="px-4 py-3 font-medium text-ink-800">{clientName(t)}</td>
                <td className="px-4 py-3 text-ink-500">{sourceLabel(t)}</td>
                <td className="px-4 py-3 text-right font-semibold text-ink-900">Tk {Math.abs(t.amount)}</td>
              </tr>
            ))}
            {inRange.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-400">No earning records in this range.</td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-4 pb-3" />
      </div>
    </div>
  );
}