import { useEffect, useState } from "react";
import { Banknote, Building2 } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import Badge from "../../../../components/shared/Badge";

// Approximate meal cost used to value complimentary/subsidized meals for the
// mock dashboard — a real backend would sum actual invoice amounts.
const MOCK_MEAL_COST = 120;

export default function Subsidy() {
  const [clients, setClients] = useState(null);

  useEffect(() => {
    (async () => setClients(await dataStore.load("clients", "clients.json")))();
  }, []);

  if (!clients) return <Loader full label="Loading subsidy data..." />;

  const complimentary = clients.filter((c) => c.mealBenefit === "Complimentary");
  const subsidized = clients.filter((c) => c.mealBenefit === "Company Subsidized");
  const selfPaid = clients.filter((c) => c.mealBenefit === "Self Paid");

  const dailySubsidy = (complimentary.length + subsidized.length) * MOCK_MEAL_COST;
  const monthlySubsidy = dailySubsidy * 22; // approx working days
  const yearlySubsidy = monthlySubsidy * 12;

  const byDept = clients.reduce((acc, c) => {
    if (c.mealBenefit === "Self Paid") return acc;
    acc[c.department] = (acc[c.department] || 0) + MOCK_MEAL_COST;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Company Subsidy Management</h1>
        <p className="text-sm text-ink-400">
          Tracks meals fully or partially borne by the company (SRS §23), driven by each client's
          Meal Benefit setting (§7.3).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Today's Subsidy" value={`Tk ${dailySubsidy.toLocaleString()}`} Icon={Banknote} accent="brand" />
        <StatCard label="Monthly Subsidy" value={`Tk ${monthlySubsidy.toLocaleString()}`} Icon={Banknote} accent="amber" />
        <StatCard label="Yearly Subsidy" value={`Tk ${yearlySubsidy.toLocaleString()}`} Icon={Banknote} accent="ink" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Employee-wise Subsidy</h2>
          <div className="space-y-2">
            {clients.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
                <span className="font-medium text-ink-700">{c.name}</span>
                <Badge tone={c.mealBenefit === "Self Paid" ? "cancelled" : "active"}>{c.mealBenefit}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
            <Building2 size={16} /> Department-wise Subsidy (daily)
          </h2>
          <div className="space-y-2">
            {Object.entries(byDept).map(([dept, amt]) => (
              <div key={dept} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
                <span className="text-ink-600">{dept}</span>
                <span className="font-semibold text-brand-600">Tk {amt.toLocaleString()}</span>
              </div>
            ))}
            {Object.keys(byDept).length === 0 && (
              <p className="text-sm text-ink-400">No subsidized departments yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
