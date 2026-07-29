import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import SearchInput from "../../../../components/shared/SearchInput";

export default function ManagerPreBookings() {
  const { push } = useToast();
  const [bookings, setBookings] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => setBookings(await dataStore.load("preBookings", "pre-bookings.json")))();
  }, []);

  if (!bookings) return <Loader full label="Loading pre-bookings..." />;

  const filtered = bookings.filter((b) => b.clientName.toLowerCase().includes(query.toLowerCase()));

  async function editStatus(id, status) {
    const next = await dataStore.update("preBookings", (b) => b.id === id, { status });
    setBookings(next);
    push(`Booking marked as ${status}.`, "success");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Meal Pre-Bookings</h1>
          <p className="text-sm text-ink-400">
            After the 10:00 PM cut-off, only a Manager may edit a booking (SRS §10.2).
          </p>
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search client name..." />
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-400">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Meal</th>
              <th className="px-4 py-3">Collection</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {filtered.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-medium text-ink-800">{b.clientName}</td>
                <td className="px-4 py-3 text-ink-500">{b.date}</td>
                <td className="px-4 py-3 text-ink-500">{b.meal}</td>
                <td className="px-4 py-3 capitalize text-ink-400">{b.collectionType.replace("_", " ")}</td>
                <td className="px-4 py-3">
                  <Badge tone={b.status}>{b.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2 text-xs font-semibold">
                    <button onClick={() => editStatus(b.id, "modified")} className="text-ink-500 hover:underline">
                      Modify
                    </button>
                    <button onClick={() => editStatus(b.id, "cancelled")} className="text-brand-600 hover:underline">
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-400">
                  No pre-bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
