// FILE: src/pages/modules/client/pages/ClientStatement.jsx  (MODIFIED, full rewrite)
import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

export default function ClientStatement() {
  const { user } = useAuth();
  const { push } = useToast();
  const [clients, setClients] = useState(null);
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    (async () => {
      setClients(await dataStore.load("clients", "clients.json"));
      setOrders(await dataStore.load("orders", "orders.json"));
    })();
  }, []);

  const me = (clients || []).find((c) => c.name === user?.name) || (clients || [])[0];
  const mine = (orders || []).filter((o) => o.clientName?.includes(user?.name?.split(" ")[0] || ""));
  const totalAmount = mine.reduce((s, o) => s + o.amount, 0);
  const paid = Math.round(totalAmount * 0.6);
  const outstanding = totalAmount - paid;
  const { page, setPage, totalPages, pageItems: pagedMine } = usePagination(mine, 10);

  if (!clients || !orders) return <Loader full label="Loading your statement..." />;

  function download(format) {
    push(`${format} statement download started (mock).`, "info");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Monthly Statement</h1>
          <p className="text-sm text-ink-400">Current month summary for {me?.name}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => download("PDF")} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold hover:bg-ink-50">
            <FileText size={14} /> PDF
          </button>
          <button onClick={() => download("Excel")} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold hover:bg-ink-50">
            <Download size={14} /> Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Orders" value={mine.length} accent="ink" />
        <StatCard label="Total Amount" value={`Tk ${totalAmount}`} accent="brand" />
        <StatCard label="Paid Amount" value={`Tk ${paid}`} accent="emerald" />
        <StatCard label="Outstanding Balance" value={`Tk ${outstanding}`} accent="amber" />
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Orders This Month</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-ink-400">
            <tr>
              <th className="py-2">Date</th>
              <th className="py-2">Order</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {pagedMine.map((o) => (
              <tr key={o.id}>
                <td className="py-2 text-ink-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="py-2 font-medium text-ink-800">{o.id}</td>
                <td className="py-2 text-right font-semibold text-ink-900">Tk {o.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-1 pt-1" />
      </div>
    </div>
  );
}