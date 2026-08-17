// FILE: src/pages/modules/manager/pages/ManagerPreBookings.jsx
import { useState } from "react";
import { CalendarClock, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { genId } from "../../../../components/utils/idGenerator";
import { useToast } from "../../../../components/hooks/useToast";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import Badge from "../../../../components/shared/Badge";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import Pagination, {
  usePagination,
} from "../../../../components/shared/Pagination";
import SearchInput from "../../../../components/shared/SearchInput";

function priceForMealString(mealString, menu) {
  const names = String(mealString || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return names.reduce((sum, name) => {
    const item = menu.find((m) => m.name === name);
    return sum + (item?.price || 0);
  }, 0);
}

export default function ManagerPreBookings() {
  const { push } = useToast();
  const bookings = useLiveCollection("preBookings", "pre-bookings.json");
  const menu = useLiveCollection("menu", "menu.json");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);

  const filtered = (bookings || []).filter((b) =>
    b.clientName.toLowerCase().includes(query.toLowerCase()),
  );
  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedBookings,
  } = usePagination(filtered, 10);

  if (!bookings || !menu)
    return <Loader full label="Loading pre-bookings..." />;

  const estimateSource = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "accepted",
  );
  const byDate = estimateSource.reduce((acc, b) => {
    const amt = priceForMealString(b.meal, menu);
    acc[b.date] = acc[b.date] || { count: 0, amount: 0 };
    acc[b.date].count += 1;
    acc[b.date].amount += amt;
    return acc;
  }, {});
  const totalPlates = estimateSource.length;
  const totalEstimate = estimateSource.reduce(
    (s, b) => s + priceForMealString(b.meal, menu),
    0,
  );

  async function accept(booking) {
    setBusyId(booking.id);
    const amount = priceForMealString(booking.meal, menu);
    const order = {
      id: genId("ORD"),
      clientName: booking.clientName,
      tableNumber:
        booking.collectionType === "dine_in" ? booking.tableNumber : null,
      orderType: booking.collectionType,
      priority: "normal",
      specialInstructions: `Pre-booked for ${booking.date}`,
      items: String(booking.meal || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => {
          const m = menu.find((mm) => mm.name === name);
          return { name, qty: 1, unitPrice: m?.price || 0 };
        }),
      subtotal: amount,
      discount: 0,
      tax: 0,
      amount,
      status: "pending",
      preBookingId: booking.id,
      createdAt: new Date().toISOString(),
    };
    await dataStore.insert("orders", order);
    await dataStore.update("preBookings", (b) => b.id === booking.id, {
      status: "accepted",
    });

    // Tell the client their booking was accepted...
    socket.emit(SOCKET_EVENTS.MANAGER_ACCEPTED, {
      message: `Your pre-booking for ${booking.date} was accepted by the Manager.`,
      recipientNames: [booking.clientName],
    });

    socket.emit(SOCKET_EVENTS.ORDER_SUBMITTED, {
      message: `Pre-booked order ${order.id} for ${booking.date} is ready for the kitchen.`,
      recipientRoles: ["kitchen_head"],
    });

    push(
      `Booking accepted — Tk ${amount} added to today's estimate, order sent to kitchen.`,
      "success",
    );
    setBusyId(null);
  }

  async function reject(booking) {
    setBusyId(booking.id);
    await dataStore.update("preBookings", (b) => b.id === booking.id, {
      status: "rejected",
    });
    socket.emit(SOCKET_EVENTS.ORDER_REJECTED, {
      message: `Your pre-booking for ${booking.date} was rejected by the Manager.`,
      recipientNames: [booking.clientName],
    });
    push("Pre-booking rejected.", "info");
    setBusyId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Meal Pre-Bookings</h1>
          <p className="text-sm text-ink-400">
            Accept sends the order straight to the kitchen and counts it in the
            estimate below.
          </p>
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search client name..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Pre-Booked Plates"
          value={totalPlates}
          Icon={CalendarClock}
          accent="brand"
        />
        <StatCard
          label="Estimated Revenue"
          value={`Tk ${totalEstimate.toLocaleString()}`}
          Icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          label="Dates Covered"
          value={Object.keys(byDate).length}
          accent="sky"
        />
      </div>

      {Object.keys(byDate).length > 0 && (
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">
            Estimate by Date (for market/purchase planning)
          </h2>
          <div className="space-y-2">
            {Object.entries(byDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, v]) => (
                <div
                  key={date}
                  className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-ink-800">{date}</span>
                  <span className="text-ink-500">{v.count} plate(s)</span>
                  <span className="font-semibold text-brand-600">
                    Tk {v.amount.toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-400">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Meal</th>
              <th className="px-4 py-3">Collection</th>
              <th className="px-4 py-3">Est. Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {pagedBookings.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-medium text-ink-800">
                  {b.clientName}
                </td>
                <td className="px-4 py-3 text-ink-500">{b.date}</td>
                <td className="px-4 py-3 text-ink-500">{b.meal}</td>
                <td className="px-4 py-3 capitalize text-ink-400">
                  {b.collectionType.replace("_", " ")}
                </td>
                <td className="px-4 py-3 font-semibold text-ink-900">
                  Tk {priceForMealString(b.meal, menu)}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={b.status}>{b.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  {b.status === "confirmed" ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => accept(b)}
                        disabled={busyId === b.id}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={13} /> Accept
                      </button>
                      <button
                        onClick={() => reject(b)}
                        disabled={busyId === b.id}
                        className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  ) : (
                    <span className="block text-right text-xs text-ink-300">
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-400">
                  No pre-bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          className="px-4 pb-3"
        />
      </div>
    </div>
  );
}
