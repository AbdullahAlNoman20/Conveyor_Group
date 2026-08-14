// FILE: src/pages/modules/manager/pages/ManagerKitchenQueue.jsx (MODIFIED, full rewrite — professional table view)
import { Eye } from "lucide-react";
import { PipelineBadge } from "../../../../components/shared/OrderPipeline";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

const PRIORITY_RANK = { urgent: 0, vip: 1, high: 2, normal: 3 };
const KITCHEN_VISIBLE = ["pending", "accepted", "preparing", "delayed", "ready"];

export default function ManagerKitchenQueue() {
  const orders = useLiveCollection("orders", "orders.json");

  const queue = [...(orders || [])]
    .filter((o) => KITCHEN_VISIBLE.includes(o.status))
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3));
  const { page, setPage, totalPages, pageItems: pagedQueue } = usePagination(queue, 15);

  if (!orders) return <Loader full label="Loading kitchen queue..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Eye size={20} className="text-ink-400" />
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Kitchen Queue (View Only)</h1>
          <p className="text-sm text-ink-400">
            Coordination view — order actions belong to the Kitchen Head (SRS §14).
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase text-ink-400">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {pagedQueue.map((o) => (
                <tr key={o.id} className="hover:bg-ink-50">
                  <td className="px-4 py-3 font-semibold text-ink-900">{o.id}</td>
                  <td className="px-4 py-3 text-ink-700">{o.clientName}</td>
                  <td className="px-4 py-3 text-ink-500">
                    {o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-ink-400">
                    {o.tableNumber ? `Table ${o.tableNumber}` : "Take Away"}
                  </td>
                  <td className="px-4 py-3">
                    {o.priority !== "normal" ? (
                      <span className="rounded bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700">
                        {o.priority}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-300">Normal</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PipelineBadge status={o.status} />
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-400">
                    Queue is empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-4 pb-3" />
      </div>
    </div>
  );
}