import { useEffect, useState } from "react";
import { ClipboardList, Clock, AlertTriangle, ChefHat, CheckCircle2 } from "lucide-react";
import StatCard from "../../../../components/shared/StatCard";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import { dataStore } from "../../../../components/services/dataStore";

export default function KitchenDashboard() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    (async () => setOrders(await dataStore.load("orders", "orders.json")))();
  }, []);

  if (!orders) return <Loader full label="Loading kitchen queue..." />;

  const pending = orders.filter((o) => o.status === "pending").length;
  const preparing = orders.filter((o) => o.status === "preparing").length;
  const ready = orders.filter((o) => o.status === "ready").length;
  const completed = orders.filter((o) => o.status === "completed").length;

  const queue = [...orders]
    .filter((o) => o.status !== "completed")
    .sort((a, b) => {
      const rank = { urgent: 0, vip: 1, high: 2, normal: 3 };
      return (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3);
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Kitchen Dashboard</h1>
        <p className="text-sm text-ink-400">First-in, first-out — adjusted by priority.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Pending" value={pending} Icon={ClipboardList} accent="amber" />
        <StatCard label="Preparing" value={preparing} Icon={Clock} accent="amber" />
        <StatCard label="Ready" value={ready} Icon={ChefHat} accent="emerald" />
        <StatCard label="Completed" value={completed} Icon={CheckCircle2} accent="ink" />
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Live Queue (FIFO + Priority)</h2>
        <div className="space-y-2">
          {queue.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-3 text-sm"
            >
              <div>
                <p className="font-semibold text-ink-800">{o.id}</p>
                <p className="text-xs text-ink-400">{o.clientName}</p>
              </div>
              <span className="text-ink-500">
                {o.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}
              </span>
              {o.priority !== "normal" && (
                <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-bold uppercase text-brand-700">
                  {o.priority}
                </span>
              )}
              <Badge tone={o.status}>{o.status}</Badge>
            </div>
          ))}
          {queue.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400">Queue is empty. Nice work!</p>
          )}
        </div>
      </div>
    </div>
  );
}
