// FILE: src/pages/modules/super-admin/pages/SuperAdminDashboard.jsx  (MODIFIED, full rewrite)
import { Users, UserCheck, Utensils, DollarSign, ChefHat, Armchair } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import StatCard from "../../../../components/shared/StatCard";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";

const STATUS_COLORS = {
  pending: "#d97706",
  awaiting_manager: "#d97706",
  accepted: "#0284c7",
  preparing: "#d97706",
  ready: "#059669",
  completed: "#1c1c1d",
  delayed: "#c00000",
};

/**
 * "Overall summary + graphs" — reads live from the same shared dataStore
 * collections every other module writes to (useLiveCollection), so a new
 * order, a new client, or a status change anywhere in the app is reflected
 * here without a refresh.
 */
export default function SuperAdminDashboard() {
  const clients = useLiveCollection("clients", "clients.json");
  const orders = useLiveCollection("orders", "orders.json");
  const tables = useLiveCollection("tables", "tables.json");
  const kitchenStaff = useLiveCollection("kitchenStaff", "kitchen-staff.json");

  const { page, setPage, totalPages, pageItems: pagedClients } = usePagination(clients || [], 8);

  if (!clients || !orders || !tables || !kitchenStaff) return <Loader full label="Loading dashboard..." />;

  const activeClients = clients.filter((c) => c.status === "active").length;
  const todaysRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const activeTables = tables.filter((t) => t.status !== "free").length;
  const runningOrders = orders.filter((o) => ["pending", "awaiting_manager", "accepted", "preparing"].includes(o.status)).length;

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const statusChartData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.replace(/_/g, " "),
    value: count,
    color: STATUS_COLORS[status] || "#98999b",
  }));

  const deptCounts = clients.reduce((acc, c) => {
    acc[c.department] = (acc[c.department] || 0) + 1;
    return acc;
  }, {});
  const deptChartData = Object.entries(deptCounts).map(([dept, count]) => ({ dept, clients: count }));

  const foodCounts = orders
    .flatMap((o) => o.items || [])
    .reduce((acc, i) => {
      acc[i.name] = (acc[i.name] || 0) + i.qty;
      return acc;
    }, {});
  const topFoodData = Object.entries(foodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, qty]) => ({ name, qty }));

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
        <StatCard label="Kitchen Staff" value={kitchenStaff.length} Icon={ChefHat} accent="ink" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Orders by Status</h2>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {statusChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12, textTransform: "capitalize" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-ink-400">No orders yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Most Ordered Food</h2>
          {topFoodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topFoodData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" width={110} fontSize={11} />
                <Tooltip />
                <Bar dataKey="qty" fill="#eb2a2d" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-ink-400">No orders yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Department-wise Client Count</h2>
          {deptChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dept" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="clients" fill="#1c1c1d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-ink-400">No clients yet.</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Recent Orders</h2>
          <div className="space-y-2">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
                <span className="font-medium text-ink-700">{o.clientName}</span>
                <Badge tone={o.status}>{o.status?.replace(/_/g, " ")}</Badge>
                <span className="font-semibold text-ink-900">Tk {o.amount}</span>
              </div>
            ))}
            {orders.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No orders yet.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Client Directory</h2>
          <div className="space-y-2">
            {pagedClients.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
                <span className="font-medium text-ink-700">{c.name}</span>
                <span className="text-ink-400">{c.department}</span>
                <Badge tone={c.status === "active" ? "active" : "cancelled"}>{c.status}</Badge>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} className="pt-3" />
        </div>
      </div>
    </div>
  );
}