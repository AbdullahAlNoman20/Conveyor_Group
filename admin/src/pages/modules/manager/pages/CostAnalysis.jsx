// admin/src/pages/modules/manager/pages/CostAnalysis.jsx
import { useEffect, useState } from "react";
import {
  Printer, Download, Users, Wallet, ArrowRight, Info,
} from "lucide-react";
import { apiGet } from "../../../../components/services/api";
import { exportToExcel } from "../../../../components/utils/exportExcel";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import { useToast } from "../../../../components/hooks/useToast";
import Loader from "../../../../components/shared/Loader";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const today = () => new Date().toISOString().slice(0, 10);
const tk = (n) => `Tk ${Number(n || 0).toLocaleString()}`;

/**
 * The whole screen answers one question: does the price we charge cover what
 * the food actually costs?
 *
 * Everything else here is supporting detail, so the answer is written out in
 * plain words first and the tables come after.
 */
export default function CostAnalysis() {
  const { push } = useToast();
  const now = new Date();

  const [date, setDate] = useState(today());
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/kitchen/costs/daily?date=${date}`).then(setDaily).catch(() => setDaily(null));
  }, [date]);

  useEffect(() => {
    apiGet(`/kitchen/costs/monthly?year=${year}&month=${month}`)
      .then(setMonthly)
      .catch(() => setMonthly(null))
      .finally(() => setLoading(false));
  }, [year, month]);

  if (loading) return <Loader full label="Loading..." />;

  const s = monthly?.summary;

  function printMonthly() {
    if (!monthly) return;
    printOnLetterhead({
      title: `Food Cost Report, ${MONTHS[month]} ${year}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Food Cost Report</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${MONTHS[month]} ${year}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Meal</th><th>People</th>
              <th>Food Cost</th><th>Cost of 1 Meal</th><th>We Charge</th><th>Profit or Loss</th>
            </tr>
          </thead>
          <tbody>
            ${monthly.days
              .map(
                (d) =>
                  `<tr>
                    <td>${new Date(d.date).toLocaleDateString()}</td>
                    <td>${d.mealName || "Not set"}</td>
                    <td>${d.people}</td>
                    <td>Tk ${d.cost}</td>
                    <td>Tk ${d.costPerMeal}</td>
                    <td>Tk ${d.chargedPerMeal}</td>
                    <td>${d.marginPerMeal >= 0 ? "+" : ""}Tk ${d.marginPerMeal}</td>
                  </tr>`,
              )
              .join("")}
          </tbody>
        </table>
        <div class="row"><span class="label">Total meals served</span><span>${s.totalMeals}</span></div>
        <div class="row"><span class="label">Cost of 1 meal, average</span><span>Tk ${s.avgCostPerMeal}</span></div>
        <div class="row"><span class="label">We charge, average</span><span>Tk ${s.avgChargedPerMeal}</span></div>
        <div class="row"><span class="label">Total food cost</span><span>Tk ${s.totalCost}</span></div>
        <div class="row total">
          <span>${s.totalMargin >= 0 ? "Total profit" : "Total loss"}</span>
          <span>Tk ${Math.abs(s.totalMargin)}</span>
        </div>
      `,
    });
  }

  function downloadExcel() {
    if (!monthly) return;
    exportToExcel(
      monthly.days.map((d) => ({
        Date: new Date(d.date).toLocaleDateString(),
        Meal: d.mealName || "Not set",
        "People Served": d.people,
        "Food Cost (Tk)": d.cost,
        "Cost of 1 Meal (Tk)": d.costPerMeal,
        "We Charge (Tk)": d.chargedPerMeal,
        "Profit or Loss per Meal (Tk)": d.marginPerMeal,
        "Total Collected (Tk)": d.totalCharged,
        "Total Profit or Loss (Tk)": d.totalMargin,
      })),
      `food-cost-${year}-${String(month + 1).padStart(2, "0")}`,
    );
    push("Downloaded.", "success");
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Food Cost</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">
          See what one meal costs to cook, and compare it with the price you
          charge.
        </p>
      </div>

      {/* ───────── One day ───────── */}
      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-ink-700">Pick a day</h2>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        {!daily || daily.peopleCookedFor === 0 ? (
          <p className="mt-4 rounded-lg bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
            No meals were cooked on this day.
          </p>
        ) : (
          <>
            {/* The three numbers that produce the answer, in the order you
                would work them out on paper. */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Figure
                label="Food used"
                value={tk(daily.totalCost)}
                hint="Cost of everything cooked"
              />
              <Figure
                label="People ate"
                value={daily.peopleCookedFor}
                hint="Leave days are not counted"
                Icon={Users}
              />
              <Figure
                label="Cost of 1 meal"
                value={tk(daily.costPerMeal)}
                hint="Food used, divided by people"
                strong
              />
            </div>

            {/* The comparison, written as a sum so there is nothing to work out. */}
            <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50 p-4">
              <div className="flex flex-wrap items-center justify-center gap-3 text-center sm:gap-5">
                <Side label="You charge" value={tk(daily.chargedPerMeal)} />
                <ArrowRight size={18} className="shrink-0 text-ink-300" />
                <Side label="It costs" value={tk(daily.costPerMeal)} />
                <ArrowRight size={18} className="shrink-0 text-ink-300" />
                <Side
                  label={daily.marginPerMeal >= 0 ? "You keep" : "You lose"}
                  value={tk(Math.abs(daily.marginPerMeal))}
                  tone={daily.marginPerMeal >= 0 ? "good" : "bad"}
                />
              </div>

              <p
                className={`mt-4 rounded-lg px-3 py-2.5 text-center text-sm leading-6 ${
                  daily.marginPerMeal >= 0
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {daily.marginPerMeal >= 0
                  ? `Good. On ${daily.peopleCookedFor} meals you kept ${tk(daily.totalMargin)} in total.`
                  : `The company paid ${tk(Math.abs(daily.totalMargin))} extra for ${daily.peopleCookedFor} meals. Raise the price by ${tk(Math.abs(daily.marginPerMeal))} to break even.`}
              </p>
            </div>

            {daily.mealName && (
              <p className="mt-3 text-xs text-ink-400">
                Meal served, {daily.mealName}.
              </p>
            )}

            {daily.purchasedToday > 0 && (
              <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-ink-400">
                <Info size={12} className="mt-0.5 shrink-0" />
                You spent {tk(daily.purchasedToday)} at the market today. Only{" "}
                {tk(daily.totalCost)} of it was cooked. The rest is still in the
                store room.
              </p>
            )}

            {daily.items.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold text-ink-700">What was used</p>
                <div className="space-y-1.5">
                  {daily.items.map((i) => (
                    <div
                      key={i.id}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2 text-xs"
                    >
                      <span className="min-w-0 truncate text-ink-700">
                        {i.name}, {i.qty} {i.unit}
                      </span>
                      <span className="shrink-0 font-semibold text-ink-900">{tk(i.cost)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ───────── Whole month ───────── */}
      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-ink-700">Whole month</h2>

          <div className="flex flex-wrap gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {[0, 1, 2, 3].map((o) => {
                const y = now.getFullYear() - o;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>

            <button
              onClick={printMonthly}
              className="flex min-h-10 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold transition hover:bg-ink-50"
            >
              <Printer size={13} /> Print
            </button>

            <button
              onClick={downloadExcel}
              className="flex min-h-10 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold transition hover:bg-ink-50"
            >
              <Download size={13} /> Excel
            </button>
          </div>
        </div>

        {!s || s.totalMeals === 0 ? (
          <p className="mt-4 rounded-lg bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
            Nothing was cooked in {MONTHS[month]} {year}.
          </p>
        ) : (
          <>
            {/* Same three steps as the daily view, so the two read alike. */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Figure label="Food used" value={tk(s.totalCost)} hint={`Over ${s.daysCooked} days`} />
              <Figure label="Meals served" value={s.totalMeals} hint="All days added up" Icon={Users} />
              <Figure
                label="Cost of 1 meal"
                value={tk(s.avgCostPerMeal)}
                hint="Average for the month"
                strong
              />
            </div>

            <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50 p-4">
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
                  s.totalMargin >= 0
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {s.totalMargin >= 0
                  ? `Good. The price covers the food cost this month.`
                  : `The company paid ${tk(Math.abs(s.totalMargin))} extra this month. Raise the price by about ${tk(s.avgCostPerMeal - s.avgChargedPerMeal)} per meal to break even.`}
              </p>
            </div>

            <div className="mt-4 w-full overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-ink-50 text-xs uppercase text-ink-400">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Meal</th>
                    <th className="px-3 py-2.5 text-right">People</th>
                    <th className="px-3 py-2.5 text-right">Food Cost</th>
                    <th className="px-3 py-2.5 text-right">1 Meal</th>
                    <th className="px-3 py-2.5 text-right">We Charge</th>
                    <th className="px-3 py-2.5 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {monthly.days.map((d) => (
                    <tr key={d.date}>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-500">
                        {new Date(d.date).toLocaleDateString()}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-2.5 text-ink-700">
                        {d.mealName || "Not set"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-600">{d.people}</td>
                      <td className="px-3 py-2.5 text-right text-ink-600">Tk {d.cost}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-ink-900">
                        Tk {d.costPerMeal}
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-600">
                        Tk {d.chargedPerMeal}
                      </td>
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
          </>
        )}
      </section>
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