import { useEffect, useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";

const CUT_OFF_HOUR = 22; // 10:00 PM, per SRS 10.2
const MAX_DAYS_AHEAD = 7;

function isoDateNDaysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function ClientPreBooking() {
  const { user } = useAuth();
  const { push } = useToast();
  const [bookings, setBookings] = useState(null);
  const [date, setDate] = useState(isoDateNDaysFromNow(1));
  const [meal, setMeal] = useState("Fish Curry with Rice");
  const [collectionType, setCollectionType] = useState("dine_in");
  const [tableNumber, setTableNumber] = useState("");

  useEffect(() => {
    (async () => setBookings(await dataStore.load("preBookings", "pre-bookings.json")))();
  }, []);

  if (!bookings) return <Loader full label="Loading your bookings..." />;

  const now = new Date();
  const pastCutOff = now.getHours() >= CUT_OFF_HOUR;
  const minDate = isoDateNDaysFromNow(pastCutOff ? 2 : 1);
  const maxDate = isoDateNDaysFromNow(MAX_DAYS_AHEAD);

  async function submitBooking(e) {
    e.preventDefault();
    if (collectionType === "dine_in" && !tableNumber) {
      push("Table number is required for Dine-In collection.", "error");
      return;
    }
    const record = {
      id: genId("PB"),
      clientId: user.id,
      clientName: user.name,
      date,
      meal,
      collectionType,
      tableNumber: collectionType === "dine_in" ? Number(tableNumber) : null,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    const next = await dataStore.insert("preBookings", record);
    setBookings(next);
    push(`Meal pre-booked for ${date}.`, "success");
  }

  async function cancelBooking(id) {
    const next = await dataStore.update("preBookings", (b) => b.id === id, { status: "cancelled" });
    setBookings(next);
    push("Booking cancelled.", "info");
  }

  const mine = bookings.filter((b) => b.clientId === user?.id || b.clientName === user?.name);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Meal Pre-Booking</h1>
        <p className="text-sm text-ink-400">
          Book up to {MAX_DAYS_AHEAD} days ahead. Booking for the next day closes at 10:00 PM —
          {pastCutOff ? " that cut-off has passed, so tomorrow is no longer bookable." : " you're still before tonight's cut-off."}
        </p>
      </div>

      <form onSubmit={submitBooking} className="grid gap-4 rounded-xl border border-ink-100 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Date" required>
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </FormField>
        <FormField label="Meal" required>
          <input
            value={meal}
            onChange={(e) => setMeal(e.target.value)}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </FormField>
        <FormField label="Collection Type" required>
          <select
            value={collectionType}
            onChange={(e) => setCollectionType(e.target.value)}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="dine_in">Dine In</option>
            <option value="take_away">Take Away</option>
          </select>
        </FormField>
        <FormField label="Table Number" required={collectionType === "dine_in"}>
          <input
            type="number"
            disabled={collectionType !== "dine_in"}
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50"
          />
        </FormField>
        <button
          type="submit"
          className="col-span-full flex w-fit items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Confirm Booking
        </button>
      </form>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
          <CalendarClock size={16} /> My Bookings
        </h2>
        <div className="space-y-2">
          {mine.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm">
              <span className="font-medium text-ink-800">{b.date}</span>
              <span className="text-ink-500">{b.meal}</span>
              <span className="text-ink-400 capitalize">{b.collectionType.replace("_", " ")}</span>
              <Badge tone={b.status}>{b.status}</Badge>
              {b.status === "confirmed" && !pastCutOff && (
                <button
                  onClick={() => cancelBooking(b.id)}
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
          {mine.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400">No bookings yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
