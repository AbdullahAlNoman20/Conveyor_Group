import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import Loader from "../../../../components/shared/Loader";
import Badge from "../../../../components/shared/Badge";

const TOMORROW_ITEMS = [
  { item: "Fish", quantity: 120 },
  { item: "Chicken", quantity: 70 },
  { item: "Egg", quantity: 35 },
  { item: "Rice", quantity: 190 },
];

export default function TomorrowPlanning() {
  const [bookings, setBookings] = useState(null);

  useEffect(() => {
    (async () => setBookings(await dataStore.load("preBookings", "pre-bookings.json")))();
  }, []);

  if (!bookings) return <Loader full label="Loading tomorrow's plan..." />;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().slice(0, 10);
  const tomorrowBookings = bookings.filter((b) => b.date === tomorrowISO && b.status !== "cancelled");
  const estimatedTotal = TOMORROW_ITEMS.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Tomorrow Planning</h1>
        <p className="text-sm text-ink-400">
          Projected menu and quantities for tomorrow, combining the Weekly Menu Planner and confirmed
          Pre-Bookings (SRS §14.8).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Projected Quantities</h2>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-ink-100">
              {TOMORROW_ITEMS.map((i) => (
                <tr key={i.item}>
                  <td className="py-2 font-medium text-ink-800">{i.item}</td>
                  <td className="py-2 text-right text-ink-600">{i.quantity}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2 font-bold text-ink-900">Estimated Total Meals</td>
                <td className="py-2 text-right font-bold text-brand-600">{estimatedTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
            <CalendarClock size={16} /> Tomorrow's Confirmed Pre-Bookings ({tomorrowBookings.length})
          </h2>
          <div className="space-y-2">
            {tomorrowBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
                <span className="font-medium text-ink-700">{b.clientName}</span>
                <span className="text-ink-500">{b.meal}</span>
                <Badge tone={b.status}>{b.status}</Badge>
              </div>
            ))}
            {tomorrowBookings.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-400">No pre-bookings for tomorrow yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
