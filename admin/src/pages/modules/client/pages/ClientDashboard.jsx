import { useEffect, useState } from "react";
import { Wallet, Utensils, Receipt, QrCode } from "lucide-react";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import { dataStore } from "../../../../components/services/dataStore";
import { useAuth } from "../../../../components/hooks/useAuth";

export default function ClientDashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState(null);

  useEffect(() => {
    (async () => setClients(await dataStore.load("clients", "clients.json")))();
  }, []);

  if (!clients) return <Loader full label="Loading your dashboard..." />;

  const me = clients.find((c) => c.name === user?.name) || clients[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Welcome, {user?.name?.split(" ")[0]}</h1>
        <p className="text-sm text-ink-400">Here's your meal & billing summary for today.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Wallet Balance"
          value={`\u09F3${me?.walletBalance ?? 0}`}
          Icon={Wallet}
          accent="emerald"
        />
        <StatCard
          label="Current Month Bill"
          value={`\u09F3${me?.monthlyBill ?? 0}`}
          Icon={Receipt}
          accent="brand"
        />
        <StatCard label="Today's Orders" value={0} Icon={Utensils} accent="amber" />
        <StatCard label="QR Status" value={me?.qrStatus ?? "active"} Icon={QrCode} accent="ink" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-2 text-sm font-bold text-ink-700">Today's Meal</h2>
          <p className="text-sm text-ink-500">
            {me?.mealPlan === "Fixed Company Meal"
              ? "Your fixed meal today is set by the Weekly Meal Planner."
              : "You're on a Custom Menu — choose from the full menu when ordering."}
          </p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-2 text-sm font-bold text-ink-700">Order Progress</h2>
          <p className="text-sm text-ink-500">No active order right now.</p>
        </div>
      </div>
    </div>
  );
}
