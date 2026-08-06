import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

export default function Reports() {
  const { push } = useToast();
  const [orders, setOrders] = useState(null);
  const [clients, setClients] = useState(null);

  useEffect(() => {
    (async () => {
      setOrders(await dataStore.load("orders", "orders.json"));
      setClients(await dataStore.load("clients", "clients.json"));
    })();
  }, []);

  const dailyRevenue = (orders || []).reduce((s, o) => s + o.amount, 0);
  const foodCount = (orders || [])
    .flatMap((o) => o.items || [])
    .reduce((acc, i) => {
      acc[i.name] = (acc[i.name] || 0) + i.qty;
      return acc;
    }, {});
  const topFood = Object.entries(foodCount).sort((a, b) => b[1] - a[1]);

  const byDept = (clients || []).reduce((acc, c) => {
    acc[c.department] = (acc[c.department] || 0) + 1;
    return acc;
  }, {});
  const { page, setPage, totalPages, pageItems: pagedOrders } = usePagination(orders || [], 10);

  if (!orders || !clients) return <Loader full label="Loading reports..." />;

  function exportAs(format) {
    push(`${format} export queued (mock — no backend export service connected yet).`, "info");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Reports & Analytics</h1>
          <p className="text-sm text-ink-400">Daily, department, and food consumption reports (SRS §24).</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportAs("Excel")} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold hover:bg-ink-50">
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button onClick={() => exportAs("PDF")} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold hover:bg-ink-50">
            <FileText size={14} /> PDF
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold hover:bg-ink-50">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-ink-100 bg-white p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Daily Revenue</h2>
          <p className="text-3xl font-bold text-brand-600">Tk {dailyRevenue.toLocaleString()}</p>
          <p className="mt-1 text-xs text-ink-400">{orders.length} orders today</p>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Most Ordered Food</h2>
          <div className="space-y-2">
            {topFood.map(([name, qty]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="text-ink-600">{name}</span>
                <span className="font-semibold text-ink-900">{qty}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Department-wise Consumption</h2>
          <div className="space-y-2">
            {Object.entries(byDept).map(([dept, count]) => (
              <div key={dept} className="flex items-center justify-between text-sm">
                <span className="text-ink-600">{dept}</span>
                <span className="font-semibold text-ink-900">{count} clients</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Order-level Revenue Report</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-ink-400">
            <tr>
              <th className="py-2">Order</th>
              <th className="py-2">Client</th>
              <th className="py-2">Status</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {pagedOrders.map((o) => (
              <tr key={o.id}>
                <td className="py-2 font-medium text-ink-800">{o.id}</td>
                <td className="py-2 text-ink-600">{o.clientName}</td>
                <td className="py-2 capitalize text-ink-500">{o.status}</td>
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
