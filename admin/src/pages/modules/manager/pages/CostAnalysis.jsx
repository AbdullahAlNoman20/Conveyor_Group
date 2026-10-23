// admin/src/pages/modules/manager/pages/CostAnalysis.jsx
import { useEffect, useState } from "react";
import { Printer, Download, Users, ArrowRight, Info, TrendingDown } from "lucide-react";
import { apiGet } from "../../../../components/services/api";
import { exportToExcel } from "../../../../components/utils/exportExcel";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import { useToast } from "../../../../components/hooks/useToast";
import DateRangePicker, { useDateRange } from "../../../../components/shared/DateRangePicker";
import Loader from "../../../../components/shared/Loader";

const tk = (v) => `Tk ${Number(v || 0).toLocaleString()}`;

const TABS = [
  ["days", "By Day"],
  ["dishes", "By Dish"],
];

/**
 * One question, answered two ways: does the price cover the food.
 *
 * The plain words come first and the tables after, because a bare number
 * invites the wrong reading when it is negative.
 */
export default function CostAnalysis() {
  const { push } = useToast();
  const ctrl = useDateRange("day");

  const [tab, setTab] = useState("days");
  const [cost, setCost] = useState(null);
  const [dishes, setDishes] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const q = `from=${ctrl.range.from}&to=${ctrl.range.to}`;

    Promise.all([
      apiGet(`/kitchen/costs/period?${q}`).catch(() => null),
      apiGet(`/kitchen/costs/dishes?${q}`).catch(() => null),
    ])
      .then(([c, d]) => {
        if (!mounted) return;
        setCost(c);
        setDishes(d);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [ctrl.range.from, ctrl.range.to]);

  const s = cost?.summary;

  function print() {
    if (!cost) return;
    printOnLetterhead({
      title: `Food Cost, ${ctrl.label}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Food Cost</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${ctrl.label}</p>
        <table>
          <thead>
            <tr><th>Date</th><th>Meal</th><th>People</th><th>Food Cost</th><th>1 Meal</th><th>Charged</th><th>Profit</th></tr>
          </thead>
          <tbody>
            ${cost.days
              .map(
                (d) =>
                  `<tr><td>${new Date(d.date).toLocaleDateString()}</td><td>${d.mealName || "Not set"}</td><td>${d.people}</td><td>Tk ${d.cost}</td><td>Tk ${d.costPerMeal}</td><td>Tk ${d.chargedPerMeal}</td><td>${d.marginPerMeal >= 0 ? "+" : ""}Tk ${d.marginPerMeal}</td></tr>`,
              )
              .join("")}
          </tbody>
        </table>
        <div class="row"><span class="label">Meals served</span><span>${s.totalMeals}</span></div>
        <div class="row"><span class="label">Cost of 1 meal, average</span><span>Tk ${s.avgCostPerMeal}</span></div>
        <div class="row total">
          <span>${s.totalMargin >= 0 ? "Total profit" : "Total loss"}</span>
          <span>Tk ${Math.abs(s.totalMargin)}</span>
        </div>
      `,
    });
  }

  function downloadExcel() {
    if (!cost?.days?.length) {
      push("Nothing to export for this period.", "error");
      return;
    }

    exportToExcel(
      cost.days.map((d) => ({
        Date: new Date(d.date).toLocaleDateString(),
        Meal: d.mealName || "Not set",
        People: d.people,
        "Food Cost (Tk)": d.cost,
        "Cost of 1 Meal (Tk)": d.costPerMeal,
        "We Charge (Tk)": d.chargedPerMeal,
        "Profit per Meal (Tk)": d.marginPerMeal,
        "Total Profit (Tk)": d.totalMargin,
      })),
      `food-cost-${ctrl.range.from}-to-${ctrl.range.to}`,
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Food Cost</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">
          What one meal costs to cook, next to the price you charge.
        </p>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <DateRangePicker ctrl={ctrl} />

        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button
            onClick={print}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold transition hover:bg-ink-50"
          >
            <Printer size={14} /> Print
          </button>
          <button
            onClick={downloadExcel}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold transition hover:bg-ink-50"
          >
            <Download size={14} /> Excel
          </button>
        </div>
      </div>

      {loading ? (
        <Loader label="Loading..." />
      ) : !s || s.totalMeals === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
          Nothing was cooked in {ctrl.label}.
        </p>
      ) : (
        <>
          {/* The three steps, in the order you would work them out on paper. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Figure label="Food used" value={tk(s.totalCost)} hint={`Over ${s.daysCooked} days`} />
            <Figure label="Meals served" value={s.totalMeals} hint="Leave days not counted" Icon={Users} />
            <Figure label="Cost of 1 meal" value={tk(s.avgCostPerMeal)} hint="Average" strong />
          </div>

          <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
            <div className="flex flex-wrap items-center justify-center gap-3 text-center sm:gap-5">
              <Side label="You charged" value={tk(s.totalCharged)} />
              <ArrowRight size={18} className="shrink-0 text-ink-300" />
              <Side label="Food cost" value={tk(s.totalCost)} />
              <ArrowRight size={18} className="shrink-0 text-ink-300" />
              <Side
                label={s.totalMargin >= 0 ? "Profit" : "Loss"}
                value={tk(Math.abs(s.totalMargin))}
                tone={s.totalMargin >= 0 ? "good" : "bad"}
              />
            </div>

            <p
              className={`mt-4 rounded-lg px-3 py-2.5 text-center text-sm leading-6 ${
                s.totalMargin >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
              }`}
            >
              {s.totalMargin >= 0
                ? "Good. The price covers the food cost."
                : `The company paid ${tk(Math.abs(s.totalMargin))} extra. Raise the price by about ${tk(s.avgCostPerMeal - s.avgChargedPerMeal)} per meal to break even.`}
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-1 rounded-lg bg-ink-50 p-1 sm:flex sm:w-fit">
            {TABS.map(([key, text]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-colors sm:py-2 ${
                  tab === key ? "bg-white text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-700"
                }`}
              >
                {text}
              </button>
            ))}
          </div>

          {tab === "days" ? <DayTable days={cost.days} /> : <DishTable data={dishes} />}
        </>
      )}
    </div>
  );
}

function DayTable({ days }) {
  return (
    <>
      <div className="hidden w-full overflow-x-auto rounded-xl border border-ink-100 bg-white sm:block">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-400">
            <tr>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Meal</th>
              <th className="px-3 py-2.5 text-right">People</th>
              <th className="px-3 py-2.5 text-right">Food Cost</th>
              <th className="px-3 py-2.5 text-right">1 Meal</th>
              <th className="px-3 py-2.5 text-right">Charged</th>
              <th className="px-3 py-2.5 text-right">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {days.map((d) => (
              <tr key={d.date}>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-500">
                  {new Date(d.date).toLocaleDateString()}
                </td>
                <td className="max-w-[170px] truncate px-3 py-2.5 text-ink-700">
                  {d.mealName || "Not set"}
                </td>
                <td className="px-3 py-2.5 text-right text-ink-600">{d.people}</td>
                <td className="px-3 py-2.5 text-right text-ink-600">Tk {d.cost}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-ink-900">
                  Tk {d.costPerMeal}
                </td>
                <td className="px-3 py-2.5 text-right text-ink-600">Tk {d.chargedPerMeal}</td>
                <td
                  className={`px-3 py-2.5 text-right font-semibold ${
                    d.marginPerMeal >= 0 ? "text-emerald-600" : "text-brand-600"
                  }`}
                >
                  {d.marginPerMeal >= 0 ? "+" : ""}Tk {d.marginPerMeal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* A seven column table is unreadable on a phone, so the same rows
          become a list. */}
      <div className="space-y-2 sm:hidden">
        {days.map((d) => (
          <div key={d.date} className="rounded-xl border border-ink-100 bg-white p-3">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {d.mealName || "Not set"}
                </p>
                <p className="text-xs text-ink-400">
                  {new Date(d.date).toLocaleDateString()}, {d.people} people
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-bold ${
                  d.marginPerMeal >= 0 ? "text-emerald-600" : "text-brand-600"
                }`}
              >
                {d.marginPerMeal >= 0 ? "+" : ""}Tk {d.marginPerMeal}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-ink-500">
              Costs Tk {d.costPerMeal}, charged Tk {d.chargedPerMeal}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

function DishTable({ data }) {
  if (!data?.dishes?.length) {
    return (
      <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
        No dishes were cooked in this period.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.summary.losingDishes > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
          <TrendingDown size={13} className="mt-0.5 shrink-0" />
          {data.summary.losingDishes} dish
          {data.summary.losingDishes === 1 ? "" : "es"} cost more than they are
          charged for. The suggested price is what each would need to break even.
        </p>
      )}

      {data.dishes.map((d) => {
        const losing = d.profitPerMeal < 0;

        return (
          <div
            key={d.name}
            className={`rounded-xl border bg-white p-4 ${
              losing ? "border-amber-200" : "border-ink-100"
            }`}
          >
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900">{d.name}</p>
                <p className="text-xs text-ink-400">
                  {d.days} day{d.days === 1 ? "" : "s"}, {d.people} meals
                </p>
              </div>

              <span
                className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold ${
                  losing ? "bg-brand-50 text-brand-700" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {losing ? "Losing " : "Making "}
                {tk(Math.abs(d.totalProfit))}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Mini label="Costs" value={tk(d.costPerMeal)} />
              <Mini label="You charge" value={tk(d.chargedPerMeal)} />
              <Mini
                label={losing ? "Should charge" : "Per meal"}
                value={
                  losing
                    ? tk(d.suggestedPrice)
                    : `${d.profitPerMeal >= 0 ? "+" : ""}${tk(d.profitPerMeal)}`
                }
                tone={losing ? "bad" : "good"}
              />
            </div>

            {losing && (
              <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-amber-700">
                <Info size={12} className="mt-0.5 shrink-0" />
                Raise the price to {tk(d.suggestedPrice)} to stop losing money on
                this dish.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Figure({ label, value, hint, Icon, strong }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        strong ? "border-brand-200 bg-brand-50" : "border-ink-100 bg-white"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={13} className="shrink-0 text-ink-400" />}
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      </div>
      <p className={`mt-1 text-2xl font-bold ${strong ? "text-brand-700" : "text-ink-900"}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs leading-4 text-ink-400">{hint}</p>}
    </div>
  );
}

function Side({ label, value, tone }) {
  const color =
    tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-brand-600" : "text-ink-900";
  return (
    <div className="min-w-[88px]">
      <p className="text-xs text-ink-400">{label}</p>
      <p className={`text-lg font-bold sm:text-xl ${color}`}>{value}</p>
    </div>
  );
}

function Mini({ label, value, tone }) {
  const color =
    tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-brand-600" : "text-ink-900";
  return (
    <div className="rounded-lg bg-ink-50 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}