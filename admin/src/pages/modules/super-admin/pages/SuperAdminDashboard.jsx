import { Users, UserCheck, Utensils, Banknote } from "lucide-react";
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
import AvatarImage from "../../../../components/shared/AvatarImage";
import Loader from "../../../../components/shared/Loader";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";

export default function SuperAdminDashboard() {
  const clients = useLiveCollection("clients", "clients.json");
  const orders = useLiveCollection("orders", "orders.json");

  if (!clients || !orders) return <Loader full label="Loading dashboard..." />;

  const activeClients = clients.filter((c) => c.status === "active").length;

  const todayStr = new Date().toDateString();

  const todaysOrders = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === todayStr
  );

  const dinersToday = [
    ...new Set(todaysOrders.map((o) => o.clientName)),
  ];

  const salaryToday = todaysOrders.reduce((s, o) => s + o.amount, 0);

  const now = new Date();

  const monthOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);

    return (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });

  const salaryMonth = monthOrders.reduce((s, o) => s + o.amount, 0);

  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();

    d.setDate(d.getDate() - (6 - i));

    const label = d.toLocaleDateString(undefined, {
      weekday: "short",
    });

    const dayStr = d.toDateString();

    const count = new Set(
      orders
        .filter(
          (o) => new Date(o.createdAt).toDateString() === dayStr
        )
        .map((o) => o.clientName)
    ).size;

    return {
      day: label,
      diners: count,
    };
  });

  const recentDiners = [...todaysOrders]
    .sort(
      (a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    )
    .slice(0, 8);

  return (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden sm:space-y-6">
      {/* Header */}
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
          Super Admin Dashboard
        </h1>

        <p className="mt-1 text-xs text-ink-400 sm:text-sm">
          Clients and meal activity — updates live.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Clients"
          value={clients.length}
          Icon={Users}
          accent="ink"
        />

        <StatCard
          label="Active Clients"
          value={activeClients}
          Icon={UserCheck}
          accent="emerald"
        />

        <StatCard
          label="Diners Today"
          value={dinersToday.length}
          Icon={Utensils}
          accent="brand"
        />

        <StatCard
          label="Salary Deducted Today"
          value={`Tk ${salaryToday.toLocaleString()}`}
          Icon={Banknote}
          accent="amber"
        />
      </div>

      {/* Charts / Monthly Summary */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {/* Last 7 Days */}
        <div className="min-w-0 rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">
            Diners — Last 7 Days
          </h2>

          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={last7}
                margin={{
                  top: 5,
                  right: 5,
                  left: -10,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  allowDecimals={false}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip />

                <Bar
                  dataKey="diners"
                  fill="#eb2a2d"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* This Month */}
        <div className="min-w-0 rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">
            This Month
          </h2>

          <div className="flex h-[220px] min-w-0 flex-col items-center justify-center gap-2 px-2 text-center">
            <p className="max-w-full break-words text-3xl font-extrabold text-brand-600 sm:text-4xl">
              Tk {salaryMonth.toLocaleString()}
            </p>

            <p className="text-xs leading-5 text-ink-500 sm:text-sm">
              total salary deducted so far,{" "}
              {monthOrders.length} orders
            </p>
          </div>
        </div>
      </div>

      {/* Today's Diners */}
      <div className="min-w-0 rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-sm font-bold text-ink-700">
            Who Ate Today ({dinersToday.length})
          </h2>
        </div>

        <div className="space-y-2">
          {recentDiners.map((o) => (
            <div
              key={o.id}
              className="flex min-w-0 items-center gap-2 rounded-lg bg-ink-50 px-2.5 py-2.5 text-sm sm:gap-3 sm:px-3"
            >
              {/* Avatar */}
              <AvatarImage
                name={o.clientName}
                size={32}
                className="shrink-0"
              />

              {/* Client Name */}
              <span className="min-w-0 flex-1 truncate font-medium text-ink-800">
                {o.clientName}
              </span>

              {/* Amount */}
              <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-ink-900 sm:text-sm">
                Tk {o.amount}
              </span>
            </div>
          ))}

          {recentDiners.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400">
              No orders yet today.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}