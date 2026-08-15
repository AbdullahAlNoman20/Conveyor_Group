// FILE: src/pages/modules/manager/pages/GuestRequests.jsx (FULL REWRITE — 1-day expiry + one-time guest ordering)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Users, Clock, ShoppingCart } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { useToast } from "../../../../components/hooks/useToast";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function isExpired(r) {
  return r.status === "pending" && Date.now() - new Date(r.createdAt).getTime() > ONE_DAY_MS;
}

export default function GuestRequests() {
  const { push } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState(null);

  useEffect(() => {
    (async () => setRequests(await dataStore.load("guestRequests", "guest-requests.json")))();
  }, []);

  async function decide(id, decision) {
    const next = await dataStore.update("guestRequests", (r) => r.id === id, {
      status: decision,
    });
    setRequests(next);
    const req = next.find((r) => r.id === id);
    if (decision === "approved") {
      socket.emit(SOCKET_EVENTS.GUEST_REQUEST_APPROVED, {
        message: `Guest request for ${req.clientName} approved — guest QR generated.`,
        recipientNames: [req.clientName],
      });
      push(`Approved. Guest QR generated for ${req.clientName}'s guests.`, "success");
    } else {
      push(`Guest request from ${req.clientName} rejected.`, "info");
    }
  }

  async function orderForGuests(req) {
    await dataStore.update("guestRequests", (r) => r.id === req.id, { guestOrdered: true });
    navigate("/app/manager/new-order", {
      state: { guest: { name: `${req.clientName}'s Guests`, department: `Billed to ${req.clientName}` } },
    });
  }

  const pending = (requests || []).filter((r) => r.status === "pending" && !isExpired(r));
  const decided = (requests || []).filter((r) => r.status !== "pending" || isExpired(r));
  const { page: pendingPage, setPage: setPendingPage, totalPages: pendingTotalPages, pageItems: pagedPending } = usePagination(pending, 5);
  const { page: decidedPage, setPage: setDecidedPage, totalPages: decidedTotalPages, pageItems: pagedDecided } = usePagination(decided, 8);

  if (!requests) return <Loader full label="Loading guest requests..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Guest Requests</h1>
        
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Pending Approval ({pending.length})</h2>
        <div className="space-y-3">
          {pagedPending.map((r) => (
            <div key={r.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-amber-600" />
                  <div>
                    <p className="font-semibold text-ink-900">{r.clientName}</p>
                    <p className="text-xs text-ink-500">
                      {r.guestCount} guest(s) · {r.meal} · Pay via {r.paymentMethod}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => decide(r.id, "approved")}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button
                    onClick={() => decide(r.id, "rejected")}
                    className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {r.guests.map((g, i) => (
                  <div key={i} className="rounded bg-white px-3 py-2 text-xs text-ink-600">
                    {g.name} {g.phone && `· ${g.phone}`} {g.organization && `· ${g.organization}`}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {pending.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400">No pending guest requests.</p>
          )}
        </div>
        <Pagination page={pendingPage} totalPages={pendingTotalPages} onChange={setPendingPage} />
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Decided / Expired</h2>
        <div className="space-y-2">
          {pagedDecided.map((r) => {
            const expired = isExpired(r);
            const canOrder = r.status === "approved" && !r.guestOrdered;
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm">
                <span className="font-medium text-ink-700">{r.clientName}</span>
                <span className="text-ink-400">{r.guestCount} guest(s)</span>
                {expired ? (
                  <Badge tone="expired">
                    <span className="flex items-center gap-1"><Clock size={11} /> expired</span>
                  </Badge>
                ) : (
                  <Badge tone={r.status === "approved" ? "active" : "cancelled"}>{r.status}</Badge>
                )}
                {canOrder && (
                  <button
                    onClick={() => orderForGuests(r)}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                  >
                    <ShoppingCart size={12} /> Order for Guests
                  </button>
                )}
                {r.status === "approved" && r.guestOrdered && (
                  <span className="text-xs text-ink-300">Order already placed</span>
                )}
              </div>
            );
          })}
        </div>
        <Pagination page={decidedPage} totalPages={decidedTotalPages} onChange={setDecidedPage} />
      </div>
    </div>
  );
}