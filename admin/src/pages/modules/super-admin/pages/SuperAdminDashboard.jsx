import { useEffect, useState } from "react";
import { Users, UserCheck, Utensils, DollarSign, ChefHat, Armchair } from "lucide-react";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import { dataStore } from "../../../../components/services/dataStore";

export default function SuperAdminDashboard() {
  const [clients, setClients] = useState(null);
  const [orders, setOrders] = useState(null);
  const [tables, setTables] = useState(null);

  useEffect(() => {
    (async () => {
      setClients(await dataStore.load("clients", "clients.json"));
      setOrders(await dataStore.load("orders", "orders.json"));
      setTables(await dataStore.load("tables", "tables.json"));
    })();
  }, []);

  if (!clients || !orders || !tables) return <Loader full label="Loading dashboard..." />;

  const activeClients = clients.filter((c) => c.status === "active").length;
  const todaysRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const activeTables = tables.filter((t) => t.status !== "free").length;
  const runningOrders = orders.filter((o) => ["pending", "preparing"].includes(o.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Super Admin Dashboard</h1>
        <p className="text-sm text-ink-400">
          System-wide overview across clients, orders, kitchen, and finance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Clients" value={clients.length} Icon={Users} accent="ink" />
        <StatCard label="Active Clients" value={activeClients} Icon={UserCheck} accent="emerald" />
        <StatCard label="Running Orders" value={runningOrders} Icon={Utensils} accent="amber" />
        <StatCard
          label="Today's Revenue"
          value={`Tk ${todaysRevenue.toLocaleString()}`}
          Icon={DollarSign}
          accent="brand"
        />
        <StatCard label="Active Tables" value={activeTables} Icon={Armchair} accent="sky" />
        <StatCard label="Kitchen Staff" value={1} Icon={ChefHat} accent="ink" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Recent Orders</h2>
          <div className="space-y-2">
            {orders.slice(0, 5).map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-ink-700">{o.clientName}</span>
                <span className="text-ink-400">{o.status}</span>
                <span className="font-semibold text-ink-900">Tk {o.amount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Client Directory</h2>
          <div className="space-y-2">
            {clients.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-ink-700">{c.name}</span>
                <span className="text-ink-400">{c.department}</span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    c.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-brand-100 text-brand-700"
                  }`}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
