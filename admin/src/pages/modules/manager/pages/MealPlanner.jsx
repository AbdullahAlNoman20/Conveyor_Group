// FILE: src/pages/modules/manager/pages/MealPlanner.jsx

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

  if (!weekly || !draft || !menu) {
    return <Loader full label="Loading weekly meal planner..." />;
  }

  // Only "Fixed Meal" category items are valid choices for the daily lunch —
  // Beverages / Evening Snacks / Custom Menu items don't belong on this
  // planner, per the SRS's Fixed Company Meal definition.
  const fixedMealOptions = menu.filter(
    (m) => m.category === "Fixed Meal" && m.available !== false
  );

  function updateDay(day, mealName) {
    setDraft((list) =>
      list.map((d) => (d.day === day ? { ...d, meal: mealName } : d))
    );
  }

  async function save() {
    await dataStore.save("weeklyMenu", draft);
    setWeekly(draft);
    push(
      "Weekly menu updated. Fixed Meal clients will see these choices automatically.",
      "success"
    );
  }

  function duplicatePrevious() {
    push("Previous week's menu duplicated into this week (mock).", "info");
  }

  return (
    <div className="min-h-full space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <CalendarRange size={21} />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
                Weekly Menu Planner
              </h1>
              <p className="mt-1 text-xs text-ink-500 sm:text-sm">
                Plan the daily Fixed Meal lunch menu for the week.
              </p>
            </div>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <button
              onClick={duplicatePrevious}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-xs font-semibold text-ink-700 transition hover:bg-ink-50 sm:flex-none sm:px-4 sm:text-sm"
            >
              <Copy size={16} />
              <span className="hidden xs:inline sm:inline">
                Duplicate Previous Week
              </span>
              <span className="xs:hidden sm:hidden">Duplicate</span>
            </button>

            <button
              onClick={save}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 sm:flex-none sm:px-4 sm:text-sm"
            >
              <Save size={16} />
              Save Menu
            </button>
          </div>
        </div>
      </div>

      {/* Desktop / Tablet */}
      <div className="hidden overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm sm:block">
        <div className="border-b border-ink-100 bg-ink-50/70 px-5 py-3">
          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4 text-xs font-semibold uppercase tracking-wide text-ink-400">
            <div className="flex items-center gap-1.5">
              <CalendarRange size={14} />
              Day
            </div>
            <div>Lunch (Fixed Meal)</div>
          </div>
        </div>

        <div className="divide-y divide-ink-100">
          {draft.map((d) => {
            const selected = fixedMealOptions.find(
              (m) => m.name === d.meal
            );

            return (
              <div
                key={d.day}
                className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4 px-5 py-4 transition hover:bg-ink-50/40"
              >
                <div className="font-semibold text-ink-800">{d.day}</div>

                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-ink-100 bg-ink-50 shadow-sm">
                    <DishImage
                      name={d.meal}
                      className="h-12 w-12 object-cover"
                      rounded="rounded-full"
                      height={48}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-800">
                          {d.meal || "Select a meal"}
                        </p>

                        {selected && (
                          <p className="mt-0.5 text-xs text-ink-400">
                            Tk {selected.price}
                          </p>
                        )}
                      </div>

                      <select
                        value={d.meal}
                        onChange={(e) => updateDay(d.day, e.target.value)}
                        className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 md:w-72"
                      >
                        {!selected && d.meal && (
                          <option value={d.meal}>
                            {d.meal} (not in menu)
                          </option>
                        )}

                        {fixedMealOptions.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name} · Tk {m.price}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile */}
      <div className="space-y-3 sm:hidden">
        {draft.map((d) => {
          const selected = fixedMealOptions.find(
            (m) => m.name === d.meal
          );

          return (
            <div
              key={d.day}
              className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm"
            >
              {/* Day header */}
              <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <CalendarRange size={15} />
                  </div>

                  <span className="text-sm font-bold text-ink-800">
                    {d.day}
                  </span>
                </div>

                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400 ring-1 ring-ink-100">
                  Fixed Meal
                </span>
              </div>

              {/* Meal */}
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-ink-100 bg-ink-50 shadow-sm">
                    <DishImage
                      name={d.meal}
                      className="h-14 w-14 object-cover"
                      rounded="rounded-full"
                      height={56}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-800">
                      {d.meal || "Select a meal"}
                    </p>

                    {selected && (
                      <p className="mt-1 text-xs font-medium text-ink-400">
                        Tk {selected.price}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <select
                    value={d.meal}
                    onChange={(e) => updateDay(d.day, e.target.value)}
                    className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-sm text-ink-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  >
                    {!selected && d.meal && (
                      <option value={d.meal}>
                        {d.meal} (not in menu)
                      </option>
                    )}

                    {fixedMealOptions.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} · Tk {m.price}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}