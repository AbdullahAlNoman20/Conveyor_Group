import { useEffect, useState } from "react";
import { CalendarClock, Wheat } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import Loader from "../../../../components/shared/Loader";

// Raw material estimation per meal unit — configurable in real System Settings
// (SRS note under §14.7.2). Kept here as a simple lookup for the mock demo.
const RAW_MATERIAL_PER_MEAL = [
  { item: "Rice", perMeal: 0.2, unit: "kg" },
  { item: "Fish", perMeal: 0.15, unit: "kg" },
  { item: "Chicken", perMeal: 0.18, unit: "kg" },
  { item: "Egg", perMeal: 0.9, unit: "pcs" },
  { item: "Oil", perMeal: 0.03, unit: "L" },
];

// Mock tomorrow-meal summary — in production this is generated from the
// Meal Planner (Section 9) + Pre-Bookings (Section 10) automatically.
const TOMORROW_MEALS = [
  { food: "Fish", quantity: 145 },
  { food: "Chicken", quantity: 82 },
  { food: "Egg", quantity: 37 },
  { food: "Rice", quantity: 264 },
  { food: "Dal", quantity: 264 },
];

export default function DemandForecast() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    (async () => setOrders(await dataStore.load("orders", "orders.json")))();
  }, []);

  if (!orders) return <Loader full label="Loading demand forecast..." />;

  const totalMeals = TOMORROW_MEALS.reduce((s, m) => s + m.quantity, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Kitchen Demand Forecast</h1>
        <p className="text-sm text-ink-400">
          Auto-generated from the Meal Planner + Pre-Bookings, used to plan tomorrow's purchase (SRS §14.7).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
            <CalendarClock size={16} /> Tomorrow Meal Summary
          </h2>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-ink-400">
              <tr>
                <th className="py-2">Food</th>
                <th className="py-2 text-right">Total Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {TOMORROW_MEALS.map((m) => (
                <tr key={m.food}>
                  <td className="py-2 font-medium text-ink-800">{m.food}</td>
                  <td className="py-2 text-right text-ink-600">{m.quantity}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2 font-bold text-ink-900">Estimated Total Meals</td>
                <td className="py-2 text-right font-bold text-brand-600">{totalMeals}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
            <Wheat size={16} /> Estimated Raw Materials
          </h2>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-ink-400">
              <tr>
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Estimated Need</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {RAW_MATERIAL_PER_MEAL.map((r) => (
                <tr key={r.item}>
                  <td className="py-2 font-medium text-ink-800">{r.item}</td>
                  <td className="py-2 text-right text-ink-600">
                    {Math.round(r.perMeal * totalMeals)} {r.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-400">
            Estimation formula is configurable from System Settings (SRS §14.7.2 note).
          </p>
        </div>
      </div>
    </div>
  );
}
