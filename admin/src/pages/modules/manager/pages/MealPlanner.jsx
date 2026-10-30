// admin/src/pages/modules/manager/pages/MealPlanner.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarRange, Save, RotateCcw, UtensilsCrossed, AlertTriangle } from "lucide-react";
import { apiPut } from "../../../../components/services/api";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import { useRoleBase } from "../../../../components/hooks/useRoleBase";
import { DishImage } from "../../../../components/shared/DishImage";
import Loader from "../../../../components/shared/Loader";

// Same order as the server and the Home page belt.
const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const JS_DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CATEGORY_ORDER = ["Fixed Meal", "Custom Menu", "Evening Snack", "Beverage"];

const emptyPlan = () => Object.fromEntries(DAYS.map((d) => [d, ""]));

/**
 * The week, always seven days. Each day picks one dish from Menu Management,
 * or "No meal". Saved all at once.
 */
export default function MealPlanner() {
  const { push } = useToast();
  const base = useRoleBase();

  const [menu, setMenu] = useState(null);
  const [saved, setSaved] = useState(emptyPlan());
  const [plan, setPlan] = useState(emptyPlan());
  const [saving, setSaving] = useState(false);

  async function load() {
    const [items, week] = await Promise.all([
      dataStore.load("menu", "menu.json").catch(() => []),
      dataStore.load("weeklyMenu", "weekly-menu.json").catch(() => []),
    ]);

    const list = items || [];
    const byName = new Map(list.map((m) => [m.name.toLowerCase(), m.id]));

    const next = emptyPlan();
    for (const row of week || []) {
      if (!DAYS.includes(row.day)) continue;
      // Older rows may only carry the dish name.
      next[row.day] = row.menuItemId || byName.get(String(row.meal || "").toLowerCase()) || "";
    }

    setMenu(list);
    setSaved(next);
    setPlan(next);
  }

  useEffect(() => {
    load();
    const unsubMenu = dataStore.subscribe("menu", load);
    const unsubWeek = dataStore.subscribe("weeklyMenu", load);
    return () => {
      unsubMenu();
      unsubWeek();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byId = useMemo(() => new Map((menu || []).map((m) => [m.id, m])), [menu]);

  // Dishes grouped by category for the dropdown. Turned-off dishes are left
  // out, unless a day already uses one, so the current choice still shows.
  const groups = useMemo(() => {
    const used = new Set(Object.values(plan).filter(Boolean));
    const list = (menu || []).filter((m) => m.available !== false || used.has(m.id));
    const map = new Map();
    for (const m of list) {
      const key = m.category || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return [...map.entries()]
      .sort(([a], [b]) => {
        const ia = CATEGORY_ORDER.indexOf(a);
        const ib = CATEGORY_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map(([category, items]) => [category, items.sort((x, y) => x.name.localeCompare(y.name))]);
  }, [menu, plan]);

  if (!menu) return <Loader full label="Loading the week..." />;

  const todayName = JS_DAY[new Date().getDay()];
  const dirty = DAYS.some((d) => plan[d] !== saved[d]);
  const emptyDays = DAYS.filter((d) => !plan[d]);

  async function save() {
    setSaving(true);
    try {
      await apiPut("/menu/weekly/plan", {
        days: DAYS.map((day) => ({ day, menuItemId: plan[day] || undefined })),
      });
      await dataStore.load("weeklyMenu", "weekly-menu.json", { force: true }).catch(() => undefined);
      setSaved(plan);
      push("Weekly menu saved.", "success");
    } catch (err) {
      push(err?.message || "Could not save the weekly menu.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 sm:text-2xl">
          <CalendarRange size={22} className="shrink-0 text-brand-600" /> Weekly Menu
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">
          Pick the dish for each day. Employees see it, the price comes from the
          dish, and the shopping list fills itself from its ingredients.
        </p>
      </div>

      {menu.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 bg-white p-8 text-center">
          <UtensilsCrossed size={28} className="mx-auto text-ink-300" />
          <p className="mt-3 text-sm text-ink-500">No dishes yet. Add them in Menu Management first.</p>
          <Link
            to={`${base}/menu/new`}
            className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Add a dish
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {DAYS.map((day) => {
              const dish = byId.get(plan[day]);
              const isToday = day === todayName;
              const changed = plan[day] !== saved[day];

              return (
                <div
                  key={day}
                  className={`min-w-0 rounded-xl border bg-white p-4 ${
                    isToday ? "border-brand-300 ring-2 ring-brand-100" : "border-ink-100"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-ink-900">{day}</p>
                    <div className="flex items-center gap-1.5">
                      {changed && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                          Not saved
                        </span>
                      )}
                      {isToday && (
                        <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                          Today
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-50">
                      {dish ? (
                        <DishImage src={dish.image} name={dish.name} className="h-14 w-14 object-cover" rounded="" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-ink-300">
                          <UtensilsCrossed size={18} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <select
                        value={plan[day]}
                        onChange={(e) => setPlan((p) => ({ ...p, [day]: e.target.value }))}
                        aria-label={`Dish for ${day}`}
                        className="w-full min-w-0 rounded-lg border border-ink-200 bg-white px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:text-sm"
                      >
                        <option value="">No meal</option>
                        {groups.map(([category, items]) => (
                          <optgroup key={category} label={category}>
                            {items.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}, Tk {m.price}
                                {m.available === false ? " (off)" : ""}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <p className="mt-1 truncate text-xs text-ink-400">
                        {dish ? `${dish.category}, Tk ${dish.price}` : "Nothing served"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {emptyDays.length > 0 && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              No meal on {emptyDays.join(", ")}. Employees cannot order on those days.
            </p>
          )}

          <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-2 bg-gradient-to-t from-ink-50 via-ink-50 to-transparent px-1 pb-1 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setPlan(saved)}
              disabled={!dirty || saving}
              className="flex items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 disabled:opacity-50"
            >
              <RotateCcw size={15} /> Undo changes
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
            >
              <Save size={15} /> {saving ? "Saving..." : "Save week"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}