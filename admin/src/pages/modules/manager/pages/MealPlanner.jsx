import { useEffect, useState } from "react";
import { CalendarRange, Save, Copy } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { sanitizeText } from "../../../../components/utils/sanitize";
import { useToast } from "../../../../components/hooks/useToast";
import Loader from "../../../../components/shared/Loader";

export default function MealPlanner() {
  const { push } = useToast();
  const [weekly, setWeekly] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await dataStore.load("weeklyMenu", "weekly-menu.json");
      setWeekly(data);
      setDraft(data);
    })();
  }, []);

  if (!weekly || !draft) return <Loader full label="Loading weekly meal planner..." />;

  function updateDay(day, value) {
    setDraft((list) => list.map((d) => (d.day === day ? { ...d, meal: value } : d)));
  }

  async function save() {
    const clean = draft.map((d) => ({ day: d.day, meal: sanitizeText(d.meal, 100) }));
    await dataStore.save("weeklyMenu", clean);
    setWeekly(clean);
    push("Weekly menu updated. Fixed Meal clients will see these choices automatically.", "success");
  }

  function duplicatePrevious() {
    push("Previous week's menu duplicated into this week (mock).", "info");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Weekly Menu Planner</h1>
          <p className="text-sm text-ink-400">
            Sets the Fixed Company Meal shown automatically to Fixed-Meal clients (SRS §7.2.1 / §9).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={duplicatePrevious}
            className="flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
          >
            <Copy size={16} /> Duplicate Previous Week
          </button>
          <button
            onClick={save}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Save size={16} /> Save Menu
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-400">
            <tr>
              <th className="px-4 py-3">
                <CalendarRange size={14} className="inline -mt-0.5 mr-1" /> Day
              </th>
              <th className="px-4 py-3">Lunch (Fixed Meal)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {draft.map((d) => (
              <tr key={d.day}>
                <td className="px-4 py-3 font-semibold text-ink-800">{d.day}</td>
                <td className="px-4 py-3">
                  <input
                    value={d.meal}
                    onChange={(e) => updateDay(d.day, e.target.value)}
                    className="w-full max-w-md rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-400">
        Business rule: a Fixed-Meal client may only order that day's designated food, maximum 1
        meal per day (SRS §9.4).
      </p>
    </div>
  );
}
