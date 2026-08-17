// FILE: src/pages/modules/client/pages/ClientPreBooking.jsx
import { useState } from "react";
import { CalendarClock, Plus, Lock } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { genId } from "../../../../components/utils/idGenerator";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import FormField from "../../../../components/shared/FormField";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Pagination, {
  usePagination,
} from "../../../../components/shared/Pagination";
import DishImage from "../../../../components/shared/DishImage";
import OrderPipeline, {
  orderStatusLabel,
} from "../../../../components/shared/OrderPipeline";

const CUT_OFF_HOUR = 22;
const MAX_DAYS_AHEAD = 7;
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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
  // Needed to find the kitchen order that ManagerPreBookings.accept() spins
  // up (linked via order.preBookingId) so we can show its live pipeline.
  const orders = useLiveCollection("orders", "orders.json");

  const [date, setDate] = useState(isoDateNDaysFromNow(1));
  const [selectedMealIds, setSelectedMealIds] = useState([]);
  const [collectionType, setCollectionType] = useState("dine_in");
  const [tableNumber, setTableNumber] = useState("");

  const mine = (bookings || []).filter(
    (b) => b.clientId === user?.id || b.clientName === user?.name,
  );
  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedMine,
  } = usePagination(mine, 8);

  if (!bookings || !clients || !weeklyMenu || !menu || !orders) {
    return <Loader full label="Loading your bookings..." />;
  }

  const me = clients.find((c) => c.name === user?.name) || clients[0];
  const isFixed = me?.mealPlan === "Fixed Company Meal";

  const now = new Date();
  const pastCutOff = now.getHours() >= CUT_OFF_HOUR;
  const minDate = isoDateNDaysFromNow(pastCutOff ? 2 : 1);
  const maxDate = isoDateNDaysFromNow(MAX_DAYS_AHEAD);

  const dayNameForSelectedDate = dayNameForISO(date);
  const fixedMealForDate = weeklyMenu.find(
    (d) => d.day === dayNameForSelectedDate,
  )?.meal;
  const availableMenu = menu.filter((m) => m.available !== false);

  function toggleMeal(menuId) {
    setSelectedMealIds((list) =>
      list.includes(menuId)
        ? list.filter((id) => id !== menuId)
        : [...list, menuId],
    );
  }

  const selectedMealNames = isFixed
    ? [fixedMealForDate]
    : availableMenu
        .filter((m) => selectedMealIds.includes(m.id))
        .map((m) => m.name);

  function linkedOrderFor(booking) {
    return orders.find((o) => o.preBookingId === booking.id);
  }

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
    socket.emit(SOCKET_EVENTS.BOOKING_SUBMITTED, {
      message: `${user.name} pre-booked a meal for ${date}.`,
      recipientRoles: ["manager"],
    });
    push(`Meal pre-booked for ${date}.`, "success");
    setSelectedMealIds([]);
  }

  async function cancelBooking(id) {
    await dataStore.update("preBookings", (b) => b.id === id, {
      status: "cancelled",
    });
    push("Booking cancelled.", "info");
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <CalendarClock size={21} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
              Meal Pre-Booking
            </h1>
            <p className="mt-1 text-xs leading-5 text-ink-400 sm:text-sm">
              Book up to {MAX_DAYS_AHEAD} days ahead. Booking for the next day
              closes at 10:00 PM —
              {pastCutOff
                ? " that cut-off has passed, so tomorrow is no longer bookable."
                : " you're still before tonight's cut-off."}{" "}
              You can cancel any time before the Manager accepts it — after
              that, it's locked in and moves through the kitchen pipeline below.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={submitBooking}
        className="min-w-0 space-y-5 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Date" required>
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-w-0 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <FormField label="Collection Type" required>
            <select
              value={collectionType}
              onChange={(e) => setCollectionType(e.target.value)}
              className="w-full min-w-0 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="dine_in">Dine In</option>
              <option value="take_away">Take Away</option>
            </select>
          </FormField>
          <FormField
            label="Table Number"
            required={collectionType === "dine_in"}
          >
            <input
              type="number"
              disabled={collectionType !== "dine_in"}
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full min-w-0 rounded-xl border border-ink-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50"
            />
          </FormField>
        </div>

        {isFixed ? (
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-semibold text-ink-700">
              Meal for {dayNameForSelectedDate}
            </label>
            <div className="flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-ink-200 bg-ink-50 p-3 sm:p-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white bg-white shadow-sm sm:h-20 sm:w-20">
                <DishImage
                  name={fixedMealForDate}
                  className="h-full w-full object-cover"
                  rounded="rounded-xl"
                  height={80}
                />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex min-w-0 items-center gap-2">
                  <Lock size={14} className="shrink-0 text-ink-400" />
                  <p className="min-w-0 truncate text-sm font-semibold text-ink-800 sm:text-base">
                    {fixedMealForDate || "No fixed meal set for this day"}
                  </p>
                </div>
                <p className="mt-1 text-xs text-ink-400">Fixed Company Meal</p>
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-400">
              Your Meal Plan is Fixed Company Meal — the meal for the selected
              day is set automatically by the Weekly Menu Planner and can't be
              changed.
            </p>
          </div>
        ) : (
          <div className="min-w-0">
            <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-semibold text-ink-700">
                Choose Meal(s)
              </label>
              <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600">
                {selectedMealIds.length} selected
              </span>
            </div>
            <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-ink-200 p-2 sm:p-3">
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                {availableMenu.map((m) => (
                  <label
                    key={m.id}
                    className={`flex min-w-0 w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl border p-2.5 transition-colors ${
                      selectedMealIds.includes(m.id)
                        ? "border-brand-400 bg-brand-50"
                        : "border-ink-100 bg-white hover:bg-ink-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMealIds.includes(m.id)}
                      onChange={() => toggleMeal(m.id)}
                      className="h-4 w-4 shrink-0 accent-brand-600"
                    />
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                      <DishImage
                        name={m.name}
                        className="h-full w-full object-cover"
                        rounded="rounded-xl"
                        height={48}
                      />
                    </div>
                    <span className="min-w-0 flex-1 overflow-hidden">
                      <span className="block truncate text-sm font-semibold text-ink-800">
                        {m.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-400">
                        {m.category}
                      </span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap rounded-lg bg-ink-50 px-2 py-1.5 text-xs font-semibold text-ink-600">
                      Tk {m.price}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-ink-100 pt-4">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 sm:w-auto"
          >
            <Plus size={16} /> Confirm Booking
          </button>
        </div>
      </form>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
        <div className="border-b border-ink-100 bg-ink-50/60 p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink-700">
            <CalendarClock size={16} /> My Bookings
          </h2>
        </div>

        <div className="p-3 sm:p-4">
          <div className="space-y-3">
            {pagedMine.map((b) => {
              const linkedOrder = linkedOrderFor(b);
              return (
                <div
                  key={b.id}
                  className="min-w-0 overflow-hidden rounded-xl border border-ink-100 bg-white"
                >
                  <div className="grid min-w-0 gap-3 p-3 sm:grid-cols-[120px_minmax(0,1fr)_120px_auto] sm:items-center sm:p-4">
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400 sm:hidden">
                        Date
                      </p>
                      <span className="font-semibold text-ink-800">
                        {b.date}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400 sm:hidden">
                        Meal
                      </p>
                      <span className="block truncate text-sm text-ink-600">
                        {b.meal}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400 sm:hidden">
                        Collection
                      </p>
                      <span className="text-sm capitalize text-ink-500">
                        {b.collectionType.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
                      <Badge tone={b.status}>{b.status}</Badge>
                      {b.status === "confirmed" && !pastCutOff && (
                        <button
                          onClick={() => cancelBooking(b.id)}
                          className="shrink-0 text-xs font-semibold text-brand-600 hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {linkedOrder && (
                    <div className="border-t border-ink-100 bg-ink-50/40 p-3 sm:p-4">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink-600">
                          Kitchen Order {linkedOrder.id}
                        </span>
                        <span className="text-ink-400">
                          {orderStatusLabel(linkedOrder.status)}
                        </span>
                      </div>
                      <OrderPipeline status={linkedOrder.status} />
                    </div>
                  )}
                </div>
              );
            })}

            {mine.length === 0 && (
              <p className="rounded-xl border border-dashed border-ink-200 py-10 text-center text-sm text-ink-400">
                No bookings yet.
              </p>
            )}
          </div>

          <div className="mt-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
