// FILE: src/pages/modules/manager/pages/MealPlanner.jsx (FULL REWRITE — dropdown from live menu, not free text)
import { useEffect, useState } from "react";
import { CalendarRange, Save, Copy } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import Loader from "../../../../components/shared/Loader";
import DishImage from "../../../../components/shared/DishImage";

export default function MealPlanner() {
  const { push } = useToast();
  const menu = useLiveCollection("menu", "menu.json");
  const [weekly, setWeekly] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await dataStore.load("weeklyMenu", "weekly-menu.json");
      setWeekly(data);
      setDraft(data);
    })();
  }, []);

  if (!weekly || !draft || !menu) return <Loader full label="Loading weekly meal planner..." />;

  // Only "Fixed Meal" category items are valid choices for the daily lunch —
  // Beverages / Evening Snacks / Custom Menu items don't belong on this
  // planner, per the SRS's Fixed Company Meal definition.
  const fixedMealOptions = menu.filter((m) => m.category === "Fixed Meal" && m.available !== false);

  function updateDay(day, mealName) {
    setDraft((list) => list.map((d) => (d.day === day ? { ...d, meal: mealName } : d)));
  }

  async function save() {
    await dataStore.save("weeklyMenu", draft);
    setWeekly(draft);
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
            {draft.map((d) => {
              const selected = fixedMealOptions.find((m) => m.name === d.meal);
              return (
                <tr key={d.day}>
                  <td className="px-4 py-3 font-semibold text-ink-800">{d.day}</td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-md items-center gap-3">
                      <DishImage
                        name={d.meal}
                        className="h-10 w-10 shrink-0 rounded-lg"
                        rounded="rounded-lg"
                        height={40}
                      />
                      <select
                        value={d.meal}
                        onChange={(e) => updateDay(d.day, e.target.value)}
                        className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      >
                        {!selected && d.meal && <option value={d.meal}>{d.meal} (not in menu)</option>}
                        {fixedMealOptions.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name} · Tk {m.price}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-400">
        Business rule: a Fixed-Meal client may only order that day's designated food, maximum 1
        lunch per day — Evening Snacks are exempt from this limit (SRS §9.4 / §14).
      </p>
    </div>
  );
}