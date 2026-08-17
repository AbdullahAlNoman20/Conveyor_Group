// FILE: src/pages/modules/client/pages/ClientDashboard.jsx
import { Wallet, Utensils, Receipt, QrCode, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import OrderPipeline, {
  orderStatusLabel,
} from "../../../../components/shared/OrderPipeline";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { useAuth } from "../../../../components/hooks/useAuth";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function startOfWeek(d) {
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const clients = useLiveCollection("clients", "clients.json");

  const orders = useLiveCollection("orders", "orders.json");
  const weeklyMenu = useLiveCollection("weeklyMenu", "weekly-menu.json");

  if (!clients || !orders || !weeklyMenu)
    return <Loader full label="Loading your dashboard..." />;

  const me = clients.find((c) => c.name === user?.name) || clients[0];
  const myOrders = orders.filter(
    (o) => o.clientId === user?.id || o.clientName === user?.name,
  );

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const billable = myOrders.filter(
    (o) => !["cancelled", "rejected"].includes(o.status),
  );
  const todaysOrders = billable.filter(
    (o) => (o.createdAt || "").slice(0, 10) === todayISO,
  );
  const weeksOrders = billable.filter(
    (o) => new Date(o.createdAt) >= weekStart,
  );
  const monthsOrders = billable.filter(
    (o) => new Date(o.createdAt) >= monthStart,
  );

  const todaySpend = todaysOrders.reduce((s, o) => s + o.amount, 0);
  const weekSpend = weeksOrders.reduce((s, o) => s + o.amount, 0);
  const monthSpend = monthsOrders.reduce((s, o) => s + o.amount, 0);
  const maxSpend = Math.max(todaySpend, weekSpend, monthSpend, 1);

  const activeOrders = [...myOrders]
    .filter((o) => !["completed", "cancelled", "rejected"].includes(o.status))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const todayName = WEEKDAYS[new Date().getDay()];
  const todaysFixedMeal = weeklyMenu.find((d) => d.day === todayName)?.meal;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">
          Welcome, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-ink-400">
          Here's your meal & billing summary for today.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Wallet Balance"
          value={`Tk ${me?.walletBalance ?? 0}`}
          Icon={Wallet}
          accent="emerald"
        />
        <StatCard
          label="Current Month Bill"
          value={`Tk ${me?.monthlyBill ?? 0}`}
          Icon={Receipt}
          accent="brand"
        />
        <StatCard
          label="Today's Orders"
          value={todaysOrders.length}
          Icon={Utensils}
          accent="amber"
        />
        <StatCard
          label="QR Status"
          value={me?.qrStatus ?? "active"}
          Icon={QrCode}
          accent="ink"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-2 text-sm font-bold text-ink-700">Today's Meal</h2>
          {me?.mealPlan === "Fixed Company Meal" ? (
            <p className="text-sm text-ink-600">
              Your fixed meal today (
              <span className="font-semibold text-ink-900">{todayName}</span>)
              is{" "}
              <span className="font-semibold text-brand-600">
                {todaysFixedMeal}
              </span>
              . This is set by the Weekly Meal Planner and can't be changed.
            </p>
          ) : (
            <p className="text-sm text-ink-500">
              You're on a Custom Menu — choose from the full menu when you place
              an order.
            </p>
          )}
        </div>

        {/* Spend Summary — bar comparison + link to the full detail/print page */}
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink-700">
              <TrendingUp size={15} /> Spend Summary
            </h2>
            <Link
              to="/app/client/spend-detail"
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              View Details
            </Link>
          </div>
          <div className="space-y-3">
            {[
              ["Today", todaySpend],
              ["This Week", weekSpend],
              ["This Month", monthSpend],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-500">{label}</span>
                  <span className="font-semibold text-ink-900">Tk {value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{
                      width: `${Math.max(4, (value / maxSpend) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Progress — one tracker per active order */}
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">
          Order Progress{" "}
          {activeOrders.length > 0 && `(${activeOrders.length} active)`}
        </h2>
        {activeOrders.length === 0 ? (
          <p className="text-sm text-ink-500">No active order right now.</p>
        ) : (
          <div className="space-y-5 divide-y divide-ink-100">
            {activeOrders.map((o) => (
              <div key={o.id} className="pt-5 first:pt-0">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink-800">{o.id}</span>
                  <span className="text-ink-400">
                    {orderStatusLabel(o.status)}
                  </span>
                </div>
                <OrderPipeline status={o.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
