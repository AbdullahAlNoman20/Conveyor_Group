import { useMemo } from "react";
import { PackageCheck, Truck, CheckCircle2, Bell } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import { PipelineBadge } from "../../../../components/shared/OrderPipeline";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useNotifications } from "../../../../components/hooks/useNotifications";

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function WaiterDashboard() {
  const { user } = useAuth();
  const orders = useLiveCollection("orders", "orders.json");
  const { items: notifications } = useNotifications();

  const summary = useMemo(() => {
    const mine = (orders || []).filter((o) => o.assignedWaiterName === user?.name);
    const now = new Date();
    const todayStr = now.toDateString();
    const weekStart = startOfWeek(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let deliveredToday = 0;
    let deliveredWeek = 0;
    let deliveredMonth = 0;
    let requestsToday = 0;

    mine.forEach((o) => {
      if (o.assignedAt && new Date(o.assignedAt).toDateString() === todayStr) requestsToday += 1;
      if (o.status === "completed" && o.deliveredAt) {
        const d = new Date(o.deliveredAt);
        if (d.toDateString() === todayStr) deliveredToday += 1;
        if (d >= weekStart) deliveredWeek += 1;
        if (d >= monthStart) deliveredMonth += 1;
      }
    });

    return { deliveredToday, deliveredWeek, deliveredMonth, requestsToday };
  }, [orders, user?.name]);

  const readyForPickup = (orders || []).filter((o) => o.status === "ready" && !o.assignedToWaiter);

  if (!orders) return <Loader full label="Loading dashboard..." />;

  const chartData = [
    { name: "Today", deliveries: summary.deliveredToday },
    { name: "This Week", deliveries: summary.deliveredWeek },
    { name: "This Month", deliveries: summary.deliveredMonth },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Welcome, {user?.name?.split(" ")[0]}</h1>
        <p className="text-sm text-ink-400">Your delivery performance — updates live.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Delivered Today" value={summary.deliveredToday} Icon={CheckCircle2} accent="emerald" />
        <StatCard label="Delivered This Week" value={summary.deliveredWeek} Icon={Truck} accent="amber" />
        <StatCard label="Delivered This Month" value={summary.deliveredMonth} Icon={PackageCheck} accent="brand" />
        <StatCard label="Requests Received Today" value={summary.requestsToday} Icon={Bell} accent="sky" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Delivery Performance</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="deliveries" fill="#eb2a2d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink-700">Notifications</h2>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600">
              {notifications.length}
            </span>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {notifications.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className={`rounded-lg px-3 py-2 text-sm ${n.read ? "bg-ink-50 text-ink-500" : "bg-brand-50 text-ink-800"}`}
              >
                {n.message}
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-400">No notifications yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Ready for Pickup</h2>
        <div className="space-y-2">
          {readyForPickup.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-3 text-sm">
              <span className="font-semibold text-ink-800">{o.id}</span>
              <span className="text-ink-500">{o.tableNumber ? `Table ${o.tableNumber}` : "Take Away"}</span>
              <PipelineBadge status={o.status} />
            </div>
          ))}
          {readyForPickup.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400">Nothing ready to deliver yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}