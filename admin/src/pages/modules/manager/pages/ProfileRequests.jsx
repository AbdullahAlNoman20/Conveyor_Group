import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, UserCog } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";

export default function ProfileRequests() {
  const { push } = useToast();
  const [requests, setRequests] = useState(null);
  const [clients, setClients] = useState(null);

  useEffect(() => {
    (async () => {
      setRequests(await dataStore.load("profileRequests", "profile-requests.json"));
      setClients(await dataStore.load("clients", "clients.json"));
    })();
  }, []);

  if (!requests || !clients) return <Loader full label="Loading profile requests..." />;

  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

  async function approve(req) {
    const nextClients = await dataStore.update("clients", (c) => c.id === req.clientId, {
      name: req.requestedName,
      ...(req.requestedPhoto ? { photo: req.requestedPhoto } : {}),
    });
    setClients(nextClients);
    const nextRequests = await dataStore.update("profileRequests", (r) => r.id === req.id, {
      status: "approved",
    });
    setRequests(nextRequests);
    push(`Profile updated for ${req.requestedName}.`, "success");
  }

  async function reject(req) {
    const next = await dataStore.update("profileRequests", (r) => r.id === req.id, {
      status: "rejected",
    });
    setRequests(next);
    push("Profile change request rejected.", "info");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Profile Change Requests</h1>
        <p className="text-sm text-ink-400">
          Clients can request a name or photo change; it only applies once you approve it.
        </p>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
          <UserCog size={16} /> Pending ({pending.length})
        </h2>
        <div className="space-y-3">
          {pending.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-ink-100 font-bold text-ink-500">
                  {r.requestedPhoto ? (
                    <img src={r.requestedPhoto} alt="" className="h-full w-full object-cover" />
                  ) : (
                    r.requestedName.charAt(0)
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {r.clientName} → <span className="text-brand-600">{r.requestedName}</span>
                  </p>
                  <p className="text-xs text-ink-500">
                    {new Date(r.createdAt).toLocaleString()}
                    {r.requestedPhoto ? " · includes a new photo" : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => approve(r)}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
                <button
                  onClick={() => reject(r)}
                  className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>
            </div>
          ))}
          {pending.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400">No pending requests.</p>
          )}
        </div>
      </div>

      {decided.length > 0 && (
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Decided</h2>
          <div className="space-y-2">
            {decided.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
                <span className="font-medium text-ink-700">{r.clientName} → {r.requestedName}</span>
                <Badge tone={r.status === "approved" ? "active" : "cancelled"}>{r.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
