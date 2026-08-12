// FILE: src/pages/modules/manager/pages/ManagerDashboard.jsx  (MODIFIED, full rewrite)
import { ClipboardList, Clock, ChefHat, CheckCircle2, Armchair, UserCheck } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Link } from "react-router-dom";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";
import { PipelineBadge } from "../../../../components/shared/OrderPipeline";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";

const STATUS_COLORS = {
  awaiting_manager: "#d97706",
  pending: "#0284c7",
  accepted: "#0284c7",
  preparing: "#d97706",
  ready: "#059669",
  completed: "#1c1c1d",
  delayed: "#c00000",
};

export default function ManagerDashboard() {
  const orders = useLiveCollection("orders", "orders.json");
  const tables = useLiveCollection("tables", "tables.json");
  const guests = useLiveCollection("guests", "guests.json");

  const { page, setPage, totalPages, pageItems: pagedOrders } = usePagination(
    (orders || []).slice().reverse(),
    8
  );

  if (!orders || !tables || !guests) return <Loader full label="Loading dashboard..." />;

  const awaitingApproval = orders.filter((o) => o.status === "awaiting_manager").length;
  const pending = orders.filter((o) => o.status === "pending").length;
  const preparing = orders.filter((o) => o.status === "preparing").length;
  const ready = orders.filter((o) => o.status === "ready").length;
  const completed = orders.filter((o) => o.status === "completed").length;
  const activeTables = tables.filter((t) => t.status !== "free").length;
  const revenue = orders.reduce((s, o) => s + o.amount, 0);

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const statusChartData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.replace(/_/g, " "),
    value: count,
    color: STATUS_COLORS[status] || "#98999b",
  }));

  const clientOrders = orders.filter((o) => !o.clientName?.startsWith("Guest")).length;
  const guestOrders = orders.length - clientOrders;
  const splitData = [
    { name: "Client", count: clientOrders },
    { name: "Guest", count: guestOrders },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Manager Dashboard</h1>
          <p className="text-sm text-ink-400">Today's operations at a glance — updates live.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/app/manager/scan-qr"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Scan QR
          </Link>
          <Link
            to="/app/manager/new-order"
            className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
          >
            New Order
          </Link>
        </div>
      </div>

      {awaitingApproval > 0 && (
        <Link
          to="/app/manager/order-approvals"
          className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100"
        >
          <span className="flex items-center gap-2">
            <UserCheck size={18} /> {awaitingApproval} client/guest order(s) waiting for your approval
          </span>
          <span className="text-amber-600 underline">Review now</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Awaiting Approval" value={awaitingApproval} Icon={UserCheck} accent="brand" />
        <StatCard label="Pending" value={pending} Icon={ClipboardList} accent="amber" />
        <StatCard label="Preparing" value={preparing} Icon={Clock} accent="amber" />
        <StatCard label="Ready" value={ready} Icon={ChefHat} accent="emerald" />
        <StatCard label="Completed" value={completed} Icon={CheckCircle2} accent="ink" />
        <StatCard label="Active Tables" value={activeTables} Icon={Armchair} accent="sky" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Orders by Status</h2>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {statusChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-ink-400">No orders yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Client vs Guest Orders</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={splitData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#eb2a2d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">
          Today's Revenue: <span className="text-brand-600">Tk {revenue.toLocaleString()}</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-ink-400">
              <tr>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Table</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {pagedOrders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2 pr-3 font-medium text-ink-800">{o.clientName}</td>
                  <td className="py-2 pr-3 text-ink-500">
                    {o.tableNumber ? `Table ${o.tableNumber}` : "Take Away"}
                  </td>
                  <td className="py-2 pr-3">
                    <PipelineBadge status={o.status} />
                  </td>
                  <td className="py-2 text-right font-semibold text-ink-900">Tk {o.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-1 pt-2" />
      </div>
    </div>
  );
}