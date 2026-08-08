import { useState } from "react";
import { CalendarClock, Plus, Lock } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import FormField from "../../../../components/shared/FormField";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

const CUT_OFF_HOUR = 22; // 10:00 PM, per SRS 10.2
const MAX_DAYS_AHEAD = 7;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function isoDateNDaysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayNameForISO(iso) {
  return DAY_NAMES[new Date(iso + "T00:00:00").getDay()];
}

export default function ClientPreBooking() {
  const { user } = useAuth();
  const { push } = useToast();
  const bookings = useLiveCollection("preBookings", "pre-bookings.json");
  const clients = useLiveCollection("clients", "clients.json");
  const weeklyMenu = useLiveCollection("weeklyMenu", "weekly-menu.json");
  const menu = useLiveCollection("menu", "menu.json");

  const [date, setDate] = useState(isoDateNDaysFromNow(1));
  const [selectedMealIds, setSelectedMealIds] = useState([]);
  const [collectionType, setCollectionType] = useState("dine_in");
  const [tableNumber, setTableNumber] = useState("");

  const mine = (bookings || []).filter((b) => b.clientId === user?.id || b.clientName === user?.name);
  const { page, setPage, totalPages, pageItems: pagedMine } = usePagination(mine, 8);

  if (!bookings || !clients || !weeklyMenu || !menu) {
    return <Loader full label="Loading your bookings..." />;
  }

  const me = clients.find((c) => c.name === user?.name) || clients[0];
  const isFixed = me?.mealPlan === "Fixed Company Meal";

  const now = new Date();
  const pastCutOff = now.getHours() >= CUT_OFF_HOUR;
  const minDate = isoDateNDaysFromNow(pastCutOff ? 2 : 1);
  const maxDate = isoDateNDaysFromNow(MAX_DAYS_AHEAD);

  const dayNameForSelectedDate = dayNameForISO(date);
  const fixedMealForDate = weeklyMenu.find((d) => d.day === dayNameForSelectedDate)?.meal;

  // Today's/that day's available menu — for Custom Menu clients this is a
  // proper multi-select dropdown instead of free text (per client request).
  const availableMenu = menu.filter((m) => m.available !== false);

  function toggleMeal(menuId) {
    setSelectedMealIds((list) =>
      list.includes(menuId) ? list.filter((id) => id !== menuId) : [...list, menuId]
    );
  }

  const selectedMealNames = isFixed
    ? [fixedMealForDate]
    : availableMenu.filter((m) => selectedMealIds.includes(m.id)).map((m) => m.name);

  async function submitBooking(e) {
    e.preventDefault();
    if (!isFixed && selectedMealIds.length === 0) {
      push("Select at least one meal to pre-book.", "error");
      return;
    }
    if (collectionType === "dine_in" && !tableNumber) {
      push("Table number is required for Dine-In collection.", "error");
      return;
    }
    const record = {
      id: genId("PB"),
      clientId: user.id,
      clientName: user.name,
      date,
      meal: selectedMealNames.join(", "),
      collectionType,
      tableNumber: collectionType === "dine_in" ? Number(tableNumber) : null,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    await dataStore.insert("preBookings", record);
    push(`Meal pre-booked for ${date}.`, "success");
    setSelectedMealIds([]);
  }

  async function cancelBooking(id) {
    await dataStore.update("preBookings", (b) => b.id === id, { status: "cancelled" });
    push("Booking cancelled.", "info");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Meal Pre-Booking</h1>
        <p className="text-sm text-ink-400">
          Book up to {MAX_DAYS_AHEAD} days ahead. Booking for the next day closes at 10:00 PM —
          {pastCutOff ? " that cut-off has passed, so tomorrow is no longer bookable." : " you're still before tonight's cut-off."}
        </p>
      </div>

      <form onSubmit={submitBooking} className="grid gap-4 rounded-xl border border-ink-100 bg-white p-5 sm:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2 lg:grid-cols-4">
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
        </div>

        {isFixed ? (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-ink-700">
              Meal for {dayNameForSelectedDate}
            </label>
            <div className="flex items-center justify-between rounded-lg border border-ink-200 bg-ink-50 px-4 py-3">
              <span className="flex items-center gap-2 font-medium text-ink-800">
                <Lock size={14} className="text-ink-400" /> {fixedMealForDate || "No fixed meal set for this day"}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-400">
              Your Meal Plan is Fixed Company Meal — the meal for the selected day is set
              automatically by the Weekly Menu Planner and can't be changed.
            </p>
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-ink-700">
              Choose Meal(s) — {selectedMealIds.length} selected
            </label>
            <div className="grid max-h-56 gap-1.5 overflow-y-auto rounded-lg border border-ink-200 p-2 sm:grid-cols-2">
              {availableMenu.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    selectedMealIds.includes(m.id)
                      ? "border-brand-400 bg-brand-50"
                      : "border-ink-100 hover:bg-ink-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedMealIds.includes(m.id)}
                      onChange={() => toggleMeal(m.id)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    {m.name}
                  </span>
                  <span className="font-semibold text-ink-500">Tk {m.price}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="sm:col-span-2 flex w-fit items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Confirm Booking
        </button>
      </form>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
          <CalendarClock size={16} /> My Bookings
        </h2>
        <div className="space-y-2">
          {pagedMine.map((b) => (
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
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
