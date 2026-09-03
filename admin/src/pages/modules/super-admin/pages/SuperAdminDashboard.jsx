import { Users, UserCheck, Utensils, Banknote } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
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
  const todaysOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === todayStr);
  const dinersToday = [...new Set(todaysOrders.map((o) => o.clientName))];
  const salaryToday = todaysOrders.reduce((s, o) => s + o.amount, 0);

  const now = new Date();
  const monthOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const salaryMonth = monthOrders.reduce((s, o) => s + o.amount, 0);

  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    const dayStr = d.toDateString();
    const count = new Set(orders.filter((o) => new Date(o.createdAt).toDateString() === dayStr).map((o) => o.clientName)).size;
    return { day: label, diners: count };
  });

  const recentDiners = [...todaysOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Super Admin Dashboard</h1>
        <p className="text-sm text-ink-400">Clients and meal activity — updates live.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Clients" value={clients.length} Icon={Users} accent="ink" />
        <StatCard label="Active Clients" value={activeClients} Icon={UserCheck} accent="emerald" />
        <StatCard label="Diners Today" value={dinersToday.length} Icon={Utensils} accent="brand" />
        <StatCard label="Salary Deducted Today" value={`Tk ${salaryToday.toLocaleString()}`} Icon={Banknote} accent="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
          <h2 className="mb-3 text-sm font-bold text-ink-700">This Month</h2>
          <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
            <p className="text-4xl font-extrabold text-brand-600">Tk {salaryMonth.toLocaleString()}</p>
            <p className="text-sm text-ink-500">total salary deducted so far, {monthOrders.length} orders</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Who Ate Today ({dinersToday.length})</h2>
        <div className="space-y-2">
          {recentDiners.map((o) => (
            <div key={o.id} className="flex items-center gap-3 rounded-lg bg-ink-50 px-3 py-2.5 text-sm">
              <AvatarImage name={o.clientName} size={32} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate font-medium text-ink-800">{o.clientName}</span>
              <span className="font-semibold text-ink-900">Tk {o.amount}</span>
            </div>
          ))}
          {recentDiners.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No orders yet today.</p>}
        </div>
      </div>
    </div>
  );
}