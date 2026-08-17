// FILE: src/pages/modules/client/pages/ClientSpendDetail.jsx 
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, TrendingUp } from "lucide-react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { useAuth } from "../../../../components/hooks/useAuth";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

const RANGES = [
  ["today", "Today"],
  ["week", "This Week"],
  ["month", "This Month"],
];

function startOfWeek(d) {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

export default function ClientSpendDetail() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orders = useLiveCollection("orders", "orders.json");
  const [range, setRange] = useState("month");

  if (!orders) return <Loader full label="Loading spend details..." />;

  const myOrders = orders.filter(
    (o) => (o.clientId === user?.id || o.clientName === user?.name) && !["cancelled", "rejected"].includes(o.status)
  );

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const inRange = myOrders.filter((o) => {
    const d = new Date(o.createdAt);
    if (range === "today") return o.createdAt.slice(0, 10) === todayISO;
    if (range === "week") return d >= weekStart;
    return d >= monthStart;
  });

  const total = inRange.reduce((s, o) => s + o.amount, 0);
  const { page, setPage, totalPages, pageItems: pagedOrders } = usePagination(
    [...inRange].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    12
  );

  function printSummary() {
    printOnLetterhead({
      title: `Spend Summary — ${RANGES.find(([k]) => k === range)[1]}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Spend Summary — ${RANGES.find(([k]) => k === range)[1]}</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${user?.name} · Generated ${new Date().toLocaleString()}</p>
        <table>
          <thead><tr><th>Date</th><th>Order</th><th>Items</th><th>Amount</th></tr></thead>
          <tbody>
            ${inRange
              .map(
                (o) =>
                  `<tr><td>${new Date(o.createdAt).toLocaleDateString()}</td><td>${o.id}</td><td>${(o.items || [])
                    .map((i) => `${i.qty}x ${i.name}`)
                    .join(", ")}</td><td>Tk ${o.amount}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
        <div class="row total"><span>Total Spend</span><span>Tk ${total}</span></div>
      `,
    });
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/app/client")}
        className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Spend Summary</h1>
          <p className="text-sm text-ink-400">A detailed breakdown of what you've spent.</p>
        </div>
        <button
          onClick={printSummary}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Printer size={16} /> Print on Company Pad
        </button>
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total Spend" value={`Tk ${total}`} Icon={TrendingUp} accent="brand" />
        <StatCard label="Orders" value={inRange.length} accent="ink" />
        <StatCard
          label="Avg. per Order"
          value={`Tk ${inRange.length ? Math.round(total / inRange.length) : 0}`}
          accent="emerald"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-400">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {pagedOrders.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 text-ink-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-medium text-ink-800">{o.id}</td>
                <td className="px-4 py-3 text-ink-500">{o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}</td>
                <td className="px-4 py-3 text-right font-semibold text-ink-900">Tk {o.amount}</td>
              </tr>
            ))}
            {inRange.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-400">
                  No orders in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-4 pb-3" />
      </div>
    </div>
  );
}