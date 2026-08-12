// FILE: src/pages/modules/super-admin/pages/Subsidy.jsx  (MODIFIED, full rewrite)
import { Banknote, Building2 } from "lucide-react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import StatCard from "../../../../components/shared/StatCard";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";
import Loader from "../../../../components/shared/Loader";
import Badge from "../../../../components/shared/Badge";

// Approximate meal cost used to value complimentary/subsidized meals for the
// mock dashboard — a real backend would sum actual invoice amounts.
const MOCK_MEAL_COST = 120;

export default function Subsidy() {
  const clients = useLiveCollection("clients", "clients.json");

  const all = clients || [];
  const complimentary = all.filter((c) => c.mealBenefit === "Complimentary");
  const subsidized = all.filter((c) => c.mealBenefit === "Company Subsidized");

  const dailySubsidy = (complimentary.length + subsidized.length) * MOCK_MEAL_COST;
  const monthlySubsidy = dailySubsidy * 22; // approx working days
  const yearlySubsidy = monthlySubsidy * 12;

  const byDept = all.reduce((acc, c) => {
    if (c.mealBenefit === "Self Paid") return acc;
    acc[c.department] = (acc[c.department] || 0) + MOCK_MEAL_COST;
    return acc;
  }, {});

  // Self-Paid employees cost the company nothing, so they don't belong in a
  // "who are we subsidizing" list — filter them out entirely, not just
  // badge them differently.
  const subsidizedEmployees = all.filter((c) => c.mealBenefit !== "Self Paid");
  const { page, setPage, totalPages, pageItems: pagedEmployees } = usePagination(subsidizedEmployees, 8);

  if (!clients) return <Loader full label="Loading subsidy data..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Company Subsidy Management</h1>
        <p className="text-sm text-ink-400">
          Tracks meals fully or partially borne by the company, driven by each client's Meal
          Benefit setting.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Today's Subsidy" value={`Tk ${dailySubsidy.toLocaleString()}`} Icon={Banknote} accent="brand" />
        <StatCard label="Monthly Subsidy" value={`Tk ${monthlySubsidy.toLocaleString()}`} Icon={Banknote} accent="amber" />
        <StatCard label="Yearly Subsidy" value={`Tk ${yearlySubsidy.toLocaleString()}`} Icon={Banknote} accent="ink" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">
            Employee-wise Subsidy <span className="font-normal text-ink-400">(Self-Paid employees excluded)</span>
          </h2>
          <div className="space-y-2">
            {pagedEmployees.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
                <span className="font-medium text-ink-700">{c.name}</span>
                <Badge tone="active">{c.mealBenefit}</Badge>
              </div>
            ))}
            {subsidizedEmployees.length === 0 && (
              <p className="text-sm text-ink-400">No subsidized employees yet.</p>
            )}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
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