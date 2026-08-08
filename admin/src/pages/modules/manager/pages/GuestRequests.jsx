// FILE: src/pages/modules/manager/pages/GuestRequests.jsx  (MODIFIED, full rewrite)
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Users } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { useToast } from "../../../../components/hooks/useToast";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

export default function GuestRequests() {
  const { push } = useToast();
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
      });
      push(`Approved. Guest QR generated for ${req.clientName}'s guests.`, "success");
    } else {
      push(`Guest request from ${req.clientName} rejected.`, "info");
    }
  }

  const pending = (requests || []).filter((r) => r.status === "pending");
  const decided = (requests || []).filter((r) => r.status !== "pending");
  const { page: pendingPage, setPage: setPendingPage, totalPages: pendingTotalPages, pageItems: pagedPending } = usePagination(pending, 5);
  const { page: decidedPage, setPage: setDecidedPage, totalPages: decidedTotalPages, pageItems: pagedDecided } = usePagination(decided, 8);

  if (!requests) return <Loader full label="Loading guest requests..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Guest Requests</h1>
        <p className="text-sm text-ink-400">
          Client-initiated guest requests (SRS §11) — approve to generate the Guest QR. All costs
          are billed to the requesting client's own account.
        </p>
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
        <h2 className="mb-3 text-sm font-bold text-ink-700">Decided</h2>
        <div className="space-y-2">
          {pagedDecided.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
              <span className="font-medium text-ink-700">{r.clientName}</span>
              <span className="text-ink-400">{r.guestCount} guest(s)</span>
              <Badge tone={r.status === "approved" ? "active" : "cancelled"}>{r.status}</Badge>
            </div>
          ))}
        </div>
        <Pagination page={decidedPage} totalPages={decidedTotalPages} onChange={setDecidedPage} />
      </div>
    </div>
  );
}