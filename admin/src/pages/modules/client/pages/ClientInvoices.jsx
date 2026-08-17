// FILE: src/pages/modules/client/pages/ClientInvoices.jsx (FULL REWRITE — summary + range filter + table + eye-icon)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Receipt, Eye, TrendingUp } from "lucide-react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { useAuth } from "../../../../components/hooks/useAuth";
import StatCard from "../../../../components/shared/StatCard";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

const RANGES = [
  ["today", "Today"],
  ["week", "This Week"],
  ["month", "This Month"],
  ["all", "All Time"],
];

function startOfWeek(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
}

export default function ClientInvoices() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const orders = useLiveCollection("orders", "orders.json");
  const [range, setRange] = useState("month");

  const ordersList = orders || [];

  const mine = ordersList.filter(
    (o) => (o.clientId === user?.id || o.clientName === user?.name) && !["cancelled", "rejected"].includes(o.status)
  );

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const filtered = mine.filter((o) => {
    if (range === "all") return true;
    const d = new Date(o.createdAt);
    if (range === "today") return o.createdAt.slice(0, 10) === todayISO;
    if (range === "week") return d >= weekStart;
    return d >= monthStart;
  });

  const total = filtered.reduce((s, o) => s + o.amount, 0);
  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const { page, setPage, totalPages, pageItems: pagedOrders } = usePagination(sorted, 10);

  if (!orders) return <Loader full label="Loading invoices..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Invoices</h1>
        <p className="text-sm text-ink-400">All your invoices — tap any row to view full details and print.</p>
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
        <StatCard label="Total Billed" value={`Tk ${total}`} Icon={TrendingUp} accent="brand" />
        <StatCard label="Invoices" value={filtered.length} Icon={Receipt} accent="ink" />
        <StatCard label="Avg. Invoice" value={`Tk ${filtered.length ? Math.round(total / filtered.length) : 0}`} accent="emerald" />
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-ink-100 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-400">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {pagedOrders.map((o) => (
              <tr key={o.id} className="hover:bg-ink-50/60">
                <td className="px-4 py-3 text-ink-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-semibold text-ink-800">{o.id}</td>
                <td className="px-4 py-3 text-ink-500">{o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}</td>
                <td className="px-4 py-3">
                  <Badge tone={o.status}>{o.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-ink-900">Tk {o.amount}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => navigate(`/app/client/orders/${o.id}`)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100" title="View & Print">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-400">No invoices in this range.</td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-4 pb-3" />
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {pagedOrders.map((o) => (
          <button
            key={o.id}
            onClick={() => navigate(`/app/client/orders/${o.id}`)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-4 text-left"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Receipt size={14} className="text-brand-600" />
                <p className="font-semibold text-ink-900">{o.id}</p>
              </div>
              <p className="mt-1 truncate text-xs text-ink-400">{o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}</p>
              <p className="mt-1 text-xs text-ink-400">{new Date(o.createdAt).toLocaleDateString()}</p>
            </div>
            <p className="shrink-0 font-bold text-ink-900">Tk {o.amount}</p>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">No invoices in this range.</p>
        )}
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}