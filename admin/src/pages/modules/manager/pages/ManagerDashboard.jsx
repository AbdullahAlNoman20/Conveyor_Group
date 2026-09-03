// FILE: src/pages/modules/manager/pages/ManagerDashboard.jsx
import { Users, Banknote, ScanLine, Utensils } from "lucide-react";
import { Link } from "react-router-dom";
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
import { getMealLimitStatus } from "../../../../components/services/mealLimit";
import { useEffect, useState } from "react";

export default function ManagerDashboard() {
  const orders = useLiveCollection("orders", "orders.json");
  const [mealStatus, setMealStatus] = useState(null);

  useEffect(() => {
    (async () => setMealStatus(await getMealLimitStatus()))();
    const t = setInterval(
      async () => setMealStatus(await getMealLimitStatus()),
      15000
    );
    return () => clearInterval(t);
  }, []);

  if (!orders) return <Loader full label="Loading dashboard..." />;

  const todayStr = new Date().toDateString();
  const todaysOrders = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === todayStr
  );
  const dinersToday = [...new Set(todaysOrders.map((o) => o.clientName))];
  const salaryToday = todaysOrders
    .filter((o) => o.paymentMethod === "salary")
    .reduce((s, o) => s + o.amount, 0);
  const mealsRemaining = mealStatus
    ? Math.max(0, mealStatus.dailyLimit - mealStatus.served)
    : null;

  // Last 7 days diners trend
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    const dayStr = d.toDateString();
    const count = new Set(
      orders
        .filter(
          (o) => new Date(o.createdAt).toDateString() === dayStr
        )
        .map((o) => o.clientName)
    ).size;

    return { day: label, diners: count };
  });

  const recent = [...todaysOrders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  return (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden sm:space-y-6">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
            Manager Dashboard
          </h1>

          <p className="mt-1 text-sm text-ink-400">
            Today's meal activity — updates live.
          </p>
        </div>

        {/* Actions */}
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <Link
            to="/app/manager/scan-qr"
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 sm:min-h-0 sm:py-2"
          >
            <ScanLine size={16} className="shrink-0" />
            <span>Scan QR — Order</span>
          </Link>

          <Link
            to="/kitchen/board"
            className="flex min-h-10 items-center justify-center rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 sm:min-h-0 sm:py-2"
          >
            Token Board
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Diners Today"
          value={dinersToday.length}
          Icon={Users}
          accent="brand"
        />

        <StatCard
          label="Salary Deducted Today"
          value={`Tk ${salaryToday.toLocaleString()}`}
          Icon={Banknote}
          accent="amber"
        />

        <StatCard
          label="Meals Remaining Today"
          value={mealsRemaining ?? "—"}
          Icon={Utensils}
          accent="emerald"
        />

        <StatCard
          label="Daily Limit"
          value={mealStatus?.dailyLimit ?? "—"}
          Icon={Utensils}
          accent="ink"
        />
      </div>

      {/* Diners Chart */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">
          Diners — Last 7 Days
        </h2>

        <div className="w-full min-w-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={last7}
              margin={{
                top: 5,
                right: 5,
                left: -10,
                bottom: 0,
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

      {/* Who Ate Today */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">
          Who Ate Today ({dinersToday.length})
        </h2>

        <div className="space-y-2">
          {recent.map((o) => (
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

              {/* Time - hidden on mobile */}
              <span className="hidden shrink-0 text-xs text-ink-400 sm:inline">
                {new Date(o.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>

              {/* Amount */}
              <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-ink-900">
                Tk {o.amount}
              </span>
            </div>
          ))}

          {recent.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400">
              No orders yet today.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}