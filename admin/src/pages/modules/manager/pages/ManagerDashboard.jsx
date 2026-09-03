import { Users, Banknote, ScanLine, Utensils } from "lucide-react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
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
    const t = setInterval(async () => setMealStatus(await getMealLimitStatus()), 15000);
    return () => clearInterval(t);
  }, []);

  if (!orders) return <Loader full label="Loading dashboard..." />;

  const todayStr = new Date().toDateString();
  const todaysOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === todayStr);
  const dinersToday = [...new Set(todaysOrders.map((o) => o.clientName))];
  const salaryToday = todaysOrders.filter((o) => o.paymentMethod === "salary").reduce((s, o) => s + o.amount, 0);
  const mealsRemaining = mealStatus ? Math.max(0, mealStatus.dailyLimit - mealStatus.served) : null;

  // Last 7 days diners trend
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    const dayStr = d.toDateString();
    const count = new Set(orders.filter((o) => new Date(o.createdAt).toDateString() === dayStr).map((o) => o.clientName)).size;
    return { day: label, diners: count };
  });

  const recent = [...todaysOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Manager Dashboard</h1>
          <p className="text-sm text-ink-400">Today's meal activity — updates live.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/manager/scan-qr" className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            <ScanLine size={16} /> Scan QR — Order
          </Link>
          <Link to="/kitchen/board" className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Token Board
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Diners Today" value={dinersToday.length} Icon={Users} accent="brand" />
        <StatCard label="Salary Deducted Today" value={`Tk ${salaryToday.toLocaleString()}`} Icon={Banknote} accent="amber" />
        <StatCard label="Meals Remaining Today" value={mealsRemaining ?? "—"} Icon={Utensils} accent="emerald" />
        <StatCard label="Daily Limit" value={mealStatus?.dailyLimit ?? "—"} Icon={Utensils} accent="ink" />
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Diners — Last 7 Days</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={last7}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={11} />
            <Tooltip />
            <Bar dataKey="diners" fill="#eb2a2d" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Who Ate Today ({dinersToday.length})</h2>
        <div className="space-y-2">
          {recent.map((o) => (
            <div key={o.id} className="flex items-center gap-3 rounded-lg bg-ink-50 px-3 py-2.5 text-sm">
              <AvatarImage name={o.clientName} size={32} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate font-medium text-ink-800">{o.clientName}</span>
              <span className="hidden text-ink-400 sm:inline">
                {new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="font-semibold text-ink-900">Tk {o.amount}</span>
            </div>
          ))}
          {recent.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No orders yet today.</p>}
        </div>
      </div>
    </div>
  );
}