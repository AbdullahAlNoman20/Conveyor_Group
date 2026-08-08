// FILE: src/pages/modules/manager/pages/ManagerKitchenQueue.jsx  (MODIFIED, full rewrite)
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

      <div className="space-y-2">
        {pagedQueue.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 bg-white p-4 text-sm">
            <div>
              <p className="font-semibold text-ink-900">{o.id}</p>
              <p className="text-xs text-ink-400">{o.clientName}</p>
            </div>
            <span className="text-ink-500">
              {o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}
            </span>
            <span className="text-ink-400">
              {o.tableNumber ? `Table ${o.tableNumber}` : "Take Away"}
            </span>
            {o.priority !== "normal" && (
              <span className="rounded bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700">
                {o.priority}
              </span>
            )}
            <PipelineBadge status={o.status} />
          </div>
        ))}
        {queue.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
            Queue is empty.
          </p>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}