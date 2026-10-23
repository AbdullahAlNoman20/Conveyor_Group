// admin/src/pages/modules/manager/pages/MealPlanner.jsx
import { useEffect, useState } from "react";
import { CalendarRange, Save, Soup } from "lucide-react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import DishImage from "../../../../components/shared/DishImage";
import Loader from "../../../../components/shared/Loader";

export default function MealPlanner() {
  const { push } = useToast();
  const menu = useLiveCollection("menu");

  const [weekly, setWeekly] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await dataStore.load("weeklyMenu");
      setWeekly(data);
      setDraft(data);
    })();
  }, []);

  if (!menu || !draft) return <Loader full label="Loading the plan..." />;

  const fixedMeals = menu.filter((m) => m.category === "Fixed Meal" && m.available);
  const dirty = JSON.stringify(draft) !== JSON.stringify(weekly);

  function setMeal(day, meal) {
    setDraft((rows) => rows.map((d) => (d.day === day ? { ...d, meal } : d)));
  }

  async function save() {
    setSaving(true);
    try {
      const next = await dataStore.save("weeklyMenu", draft);
      setWeekly(next);
      setDraft(next);
      push("Weekly plan saved.", "success");
    } catch (err) {
      push(err?.message || "Could not save the plan.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 sm:text-2xl">
            <CalendarRange size={20} /> Weekly Menu
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">
            Pick the dish for each day. Everyone on the fixed meal plan gets
            that day's dish.
          </p>
        </div>

        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
        >
          <Save size={16} /> {saving ? "Saving..." : "Save Plan"}
        </button>
      </div>

      {/* The shopping list reads the dish's ingredients, so a dish with none
          recorded quietly produces an empty list. Saying so here saves the
          Accounts team working it out at the market. */}
      <p className="flex items-start gap-2 rounded-lg bg-ink-50 px-3 py-2.5 text-xs leading-5 text-ink-500">
        <Soup size={13} className="mt-0.5 shrink-0" />
        The shopping list fills itself in from each dish's ingredients. Set
        those under Menu Management when you add or edit a dish.
      </p>

      <div className="space-y-3">
        {draft.map((d) => {
          const dish = menu.find((m) => m.name === d.meal);

          return (
            <div
              key={d.day}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-ink-100 bg-white p-4 sm:flex-row sm:items-center"
            >
              <div className="w-full shrink-0 sm:w-28">
                <p className="text-sm font-bold text-ink-900">{d.day}</p>
              </div>

              {dish && (
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                  <DishImage
                    name={dish.name}
                    src={dish.image}
                    className="h-full w-full object-cover"
                    rounded="rounded-lg"
                    height={48}
                  />
                </div>
              )}

              <select
                value={d.meal}
                onChange={(e) => setMeal(d.day, e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none transition focus:border-brand-500"
              >
                <option value="">Not set</option>
                {fixedMeals.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} — Tk {m.price}
                  </option>
                ))}
              </select>

              {dish && (
                <span className="shrink-0 whitespace-nowrap rounded-lg bg-ink-50 px-2.5 py-1.5 text-xs font-bold text-brand-600">
                  Tk {dish.price}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}