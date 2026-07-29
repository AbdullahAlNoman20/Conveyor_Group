import { useEffect, useState } from "react";
import { PackageCheck, Truck, CheckCircle2 } from "lucide-react";
import StatCard from "../../../../components/shared/StatCard";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import { dataStore } from "../../../../components/services/dataStore";

export default function WaiterDashboard() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    (async () => setOrders(await dataStore.load("orders", "orders.json")))();
  }, []);

  if (!orders) return <Loader full label="Loading orders..." />;

  const ready = orders.filter((o) => o.status === "ready");
  const completed = orders.filter((o) => o.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Waiter Dashboard</h1>
        <p className="text-sm text-ink-400">Collect ready orders and deliver them to the table.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Ready Orders" value={ready.length} Icon={PackageCheck} accent="emerald" />
        <StatCard label="Assigned Orders" value={0} Icon={Truck} accent="amber" />
        <StatCard label="Delivered Today" value={completed.length} Icon={CheckCircle2} accent="ink" />
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Ready for Pickup</h2>
        <div className="space-y-2">
          {ready.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-3 text-sm"
            >
              <span className="font-semibold text-ink-800">{o.id}</span>
              <span className="text-ink-500">
                {o.tableNumber ? `Table ${o.tableNumber}` : "Take Away"}
              </span>
              <Badge tone={o.status}>{o.status}</Badge>
              <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
                Mark Delivered
              </button>
            </div>
          ))}
          {ready.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400">Nothing ready to deliver yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
