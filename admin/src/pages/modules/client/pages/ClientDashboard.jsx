import { useEffect, useState } from "react";
import { Wallet, Utensils, Receipt, QrCode } from "lucide-react";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import OrderPipeline, { orderStatusLabel } from "../../../../components/shared/OrderPipeline";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { useAuth } from "../../../../components/hooks/useAuth";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ClientDashboard() {
  const { user } = useAuth();
  const clients = useLiveCollection("clients", "clients.json");
  const orders = useLiveCollection("orders", "orders.json");
  const weeklyMenu = useLiveCollection("weeklyMenu", "weekly-menu.json");

  if (!clients || !orders || !weeklyMenu) return <Loader full label="Loading your dashboard..." />;

  const me = clients.find((c) => c.name === user?.name) || clients[0];

  const myOrders = orders.filter((o) => o.clientId === user?.id || o.clientName === user?.name);
  const todayISO = new Date().toISOString().slice(0, 10);
  const todaysOrders = myOrders.filter((o) => (o.createdAt || "").slice(0, 10) === todayISO);

  // Most recent order that isn't finished — this is what drives the live
  // Order Progress pipeline below.
  const activeOrder = [...myOrders]
    .reverse()
    .find((o) => !["completed", "cancelled", "rejected"].includes(o.status));

  const todayName = WEEKDAYS[new Date().getDay()];
  const todaysFixedMeal = weeklyMenu.find((d) => d.day === todayName)?.meal;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Welcome, {user?.name?.split(" ")[0]}</h1>
        <p className="text-sm text-ink-400">Here's your meal & billing summary for today.</p>
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
        <StatCard label="Today's Orders" value={todaysOrders.length} Icon={Utensils} accent="amber" />
        <StatCard label="QR Status" value={me?.qrStatus ?? "active"} Icon={QrCode} accent="ink" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-2 text-sm font-bold text-ink-700">Today's Meal</h2>
          {me?.mealPlan === "Fixed Company Meal" ? (
            <p className="text-sm text-ink-600">
              Your fixed meal today (<span className="font-semibold text-ink-900">{todayName}</span>) is{" "}
              <span className="font-semibold text-brand-600">{todaysFixedMeal}</span>. This is set by
              the Weekly Meal Planner and can't be changed.
            </p>
          ) : (
            <p className="text-sm text-ink-500">
              You're on a Custom Menu — choose from the full menu when you place an order.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Order Progress</h2>
          {activeOrder ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-ink-800">{activeOrder.id}</span>
                <span className="text-ink-400">{orderStatusLabel(activeOrder.status)}</span>
              </div>
              <OrderPipeline status={activeOrder.status} />
            </div>
          ) : (
            <p className="text-sm text-ink-500">No active order right now.</p>
          )}
        </div>
      </div>
    </div>
  );
}
