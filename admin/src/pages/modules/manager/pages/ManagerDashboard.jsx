// admin/src/pages/modules/manager/pages/ManagerDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Banknote,
  ScanLine,
  Utensils,
  CalendarX,
  AlertTriangle,
} from "lucide-react";
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
import { apiGet } from "../../../../components/services/api";
import { dataStore } from "../../../../components/services/dataStore";

export default function ManagerDashboard() {
  const orders = useLiveCollection("orders");
  const [mealStatus, setMealStatus] = useState(null);
  const [attendance, setAttendance] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      const [limit, dashboard] = await Promise.all([
        getMealLimitStatus(),
        apiGet("/reports/dashboard").catch(() => null),
      ]);
      if (!mounted) return;
      setMealStatus(limit);
      if (dashboard) setAttendance(dashboard.attendance);
    }

    refresh();

    // Pushed by the server whenever someone cancels or collects.
    const unsubscribe = dataStore.subscribe("attendance", refresh);
    // Safety net in case a socket event is missed while the tab is backgrounded.
    const t = setInterval(refresh, 60_000);

    return () => {
      mounted = false;
      unsubscribe();
      clearInterval(t);
    };
  }, []);

  if (!orders) return <Loader full label="Loading dashboard..." />;

  const todayStr = new Date().toDateString();
  const todaysOrders = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === todayStr,
  );
  const dinersToday = [...new Set(todaysOrders.map((o) => o.clientName))];

  // Wallet/salary split is gone — every non-cancelled order counts.
  const valueToday = todaysOrders
    .filter((o) => !["cancelled", "rejected"].includes(o.status))
    .reduce((s, o) => s + o.amount, 0);

  const now = new Date();

  const monthOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear() &&
      !["cancelled", "rejected"].includes(o.status)
    );
  });

  const valueMonth = monthOrders.reduce((s, o) => s + o.amount, 0);

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
        .filter((o) => new Date(o.createdAt).toDateString() === dayStr)
        .map((o) => o.clientName),
    ).size;

    return { day: label, diners: count };
  });

  const recent = [...todaysOrders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  return (
    <div className="box-border w-full min-w-0 max-w-full space-y-4 overflow-x-hidden sm:space-y-6">
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

        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <Link
            to="/app/manager/scan-qr"
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 sm:min-h-0 sm:py-2"
          >
            <ScanLine size={16} className="shrink-0" />
            <span>Scan QR — Order</span>
          </Link>

          <Link
            to="/app/manager/attendance"
            className="flex min-h-10 items-center justify-center rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 sm:min-h-0 sm:py-2"
          >
            Daily Attendance
          </Link>

          <Link
            to="/kitchen/board"
            className="flex min-h-10 items-center justify-center rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 sm:min-h-0 sm:py-2"
          >
            Token Board
          </Link>
        </div>
      </div>

      {/* Statistics — five cards, so the desktop grid is 5-up rather than 4 */}
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Took Meal Today"
          value={dinersToday.length}
          Icon={Users}
          accent="brand"
        />

        <StatCard
          label="Cancelled in Time"
          value={attendance?.cancelled ?? "—"}
          Icon={CalendarX}
          accent="ink"
          trend="Not charged"
        />

        <StatCard
          label="Missed Without Cancelling"
          value={attendance?.noShow ?? "—"}
          Icon={AlertTriangle}
          accent="amber"
          trend="Cooked but not collected"
        />

        <StatCard
          label="Deducted Today"
          value={`Tk ${valueToday.toLocaleString()}`}
          Icon={Banknote}
          accent="emerald"
        />

        <StatCard
          label="Meals Remaining"
          value={mealsRemaining ?? "—"}
          Icon={Utensils}
          accent="sky"
        />
      </div>

      {/* Anyone still undecided will be swept tonight, so flag it early. */}
      {attendance?.pending > 0 && (
        <Link
          to="/app/manager/attendance"
          className="block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800 transition hover:bg-amber-100"
        >
          {attendance.pending} employee(s) haven't collected or cancelled yet —
          they'll be charged as no-shows tonight. View the register →
        </Link>
      )}

      {/* Charts / Monthly Summary */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="min-w-0 overflow-hidden rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">
            Diners — Last 7 Days
          </h2>

          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={last7}
                margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="diners" fill="#eb2a2d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">This Month</h2>

          <div className="flex h-[220px] min-w-0 flex-col items-center justify-center gap-2 px-2 text-center">
            <p className="max-w-full break-words text-3xl font-extrabold text-brand-600 sm:text-4xl">
              Tk {valueMonth.toLocaleString()}
            </p>
            <p className="text-xs leading-5 text-ink-500 sm:text-sm">
              total deducted so far, {monthOrders.length} orders
            </p>
          </div>
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
              className="box-border flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-lg bg-ink-50 px-2.5 py-2.5 text-sm sm:gap-3 sm:px-3"
            >
              <AvatarImage name={o.clientName} size={32} className="shrink-0" />

              <span className="min-w-0 flex-1 truncate font-medium text-ink-800">
                {o.clientName}
              </span>

              <span className="hidden shrink-0 text-xs text-ink-400 sm:inline">
                {new Date(o.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>

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