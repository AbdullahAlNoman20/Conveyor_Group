import { useEffect, useState } from "react";
import { UserPlus, Trash2, Send } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText } from "../../../../components/utils/sanitize";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

export default function ClientGuestRequest() {
  const { user } = useAuth();
  const { push } = useToast();
  const [requests, setRequests] = useState(null);
  const [guestCount, setGuestCount] = useState(1);
  const [guests, setGuests] = useState([{ name: "", phone: "", organization: "" }]);
  const [meal, setMeal] = useState("Lunch");
  const [paymentMethod, setPaymentMethod] = useState("wallet");

  useEffect(() => {
    (async () => setRequests(await dataStore.load("guestRequests", "guest-requests.json")))();
  }, []);

  function setCount(n) {
    const count = Math.max(1, Number(n) || 1);
    setGuestCount(count);
    setGuests((list) => {
      const next = [...list];
      while (next.length < count) next.push({ name: "", phone: "", organization: "" });
      return next.slice(0, count);
    });
  }

  function updateGuest(i, field, value) {
    setGuests((list) => list.map((g, idx) => (idx === i ? { ...g, [field]: value } : g)));
  }

  async function submit(e) {
    e.preventDefault();
    if (guests.some((g) => !g.name.trim())) {
      push("Every guest needs a name.", "error");
      return;
    }
    const record = {
      id: genId("GR"),
      clientId: user.id,
      clientName: user.name,
      guestCount,
      guests: guests.map((g) => ({
        name: sanitizeText(g.name, 80),
        phone: sanitizeText(g.phone, 20),
        organization: sanitizeText(g.organization, 80),
      })),
      meal,
      paymentMethod,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const next = await dataStore.insert("guestRequests", record);
    setRequests(next);
    socket.emit(SOCKET_EVENTS.GUEST_REQUEST_SUBMITTED, {
      message: `Guest request submitted for ${guestCount} guest(s) by ${user.name}.`,
      recipientRoles: ["manager"],
    });
    push("Guest request submitted — awaiting Manager approval.", "success");
    setGuestCount(1);
    setGuests([{ name: "", phone: "", organization: "" }]);
  }

  const mine = (requests || []).filter((r) => r.clientId === user?.id || r.clientName === user?.name);
  const { page, setPage, totalPages, pageItems: pagedMine } = usePagination(mine, 8);

  if (!requests) return <Loader full label="Loading your guest requests..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Guest Request</h1>
        
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-ink-100 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Guest Count" required>
            <input
              type="number"
              min={1}
              max={10}
              value={guestCount}
              onChange={(e) => setCount(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <FormField label="Meal" required>
            <select
              value={meal}
              onChange={(e) => setMeal(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option>Lunch</option>
              <option>Dinner</option>
            </select>
          </FormField>
          <FormField label="Payment" required>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="wallet">Wallet</option>
              <option value="salary">Salary</option>
            </select>
          </FormField>
        </div>

        <div className="space-y-3">
          {guests.map((g, i) => (
            <div key={i} className="grid gap-2 rounded-lg bg-ink-50 p-3 sm:grid-cols-3">
              <input
                placeholder="Guest Name *"
                value={g.name}
                onChange={(e) => updateGuest(i, "name", e.target.value)}
                className="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <input
                placeholder="Phone (optional)"
                value={g.phone}
                onChange={(e) => updateGuest(i, "phone", e.target.value)}
                className="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <input
                placeholder="Organization"
                value={g.organization}
                onChange={(e) => updateGuest(i, "organization", e.target.value)}
                className="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          ))}
        </div>

        <button className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          <Send size={16} /> Submit Request
        </button>
      </form>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">My Guest Requests</h2>
        <div className="space-y-2">
          {pagedMine.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
              <span className="font-medium text-ink-700">{r.guestCount} guest(s) · {r.meal}</span>
              <span className="text-ink-400">{new Date(r.createdAt).toLocaleDateString()}</span>
              <Badge tone={r.status === "approved" ? "active" : r.status === "rejected" ? "cancelled" : "pending"}>
                {r.status}
              </Badge>
            </div>
          ))}
          {mine.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400">No guest requests yet.</p>
          )}
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
