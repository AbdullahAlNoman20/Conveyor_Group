import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, UserPlus } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import Badge from "../../../../components/shared/Badge";
import AvatarImage from "../../../../components/shared/AvatarImage";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

export default function AccountRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(null);

  useEffect(() => {
    (async () => setRequests(await dataStore.load("accountRequests", "account-requests.json")))();
  }, []);

  const pending = (requests || []).filter((r) => r.status === "pending");
  const decided = (requests || []).filter((r) => r.status !== "pending");
  const pendingPage = usePagination(pending, 8);
  const decidedPage = usePagination(decided, 10);

  if (!requests) return <Loader full label="Loading account requests..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Account Requests</h1>
        <p className="text-sm text-ink-400">Self-registrations submitted from the login page — view details to approve or reject.</p>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
          <UserPlus size={16} /> Pending ({pending.length})
        </h2>
        <div className="space-y-2">
          {pendingPage.pageItems.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/app/super-admin/account-requests/${r.id}`)}
              className="flex w-full items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left hover:bg-amber-100"
            >
              <AvatarImage name={r.name} size={40} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {r.name} <span className="font-normal text-ink-500">· {r.employeeId}</span>
                </p>
                <p className="truncate text-xs text-ink-500">{r.department} · {r.mealBenefit}</p>
              </div>
              <Eye size={16} className="shrink-0 text-ink-400" />
            </button>
          ))}
          {pending.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No pending requests.</p>}
        </div>
        <Pagination page={pendingPage.page} totalPages={pendingPage.totalPages} onChange={pendingPage.setPage} />
      </div>

      {decided.length > 0 && (
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Decided</h2>
          <div className="space-y-2">
            {decidedPage.pageItems.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/app/super-admin/account-requests/${r.id}`)}
                className="flex w-full items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2 text-left text-sm hover:bg-ink-100"
              >
                <span className="font-medium text-ink-700">{r.name} · {r.employeeId}</span>
                <Badge tone={r.status === "approved" ? "active" : "cancelled"}>{r.status}</Badge>
              </button>
            ))}
          </div>
          <Pagination page={decidedPage.page} totalPages={decidedPage.totalPages} onChange={decidedPage.setPage} />
        </div>
      )}
    </div>
  );
}