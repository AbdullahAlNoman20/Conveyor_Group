import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import Loader from "../../../../components/shared/Loader";
import SearchInput from "../../../../components/shared/SearchInput";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

const CATEGORY_TONE = {
  "User Management": "bg-ink-100 text-ink-700",
  "QR Scan": "bg-sky-100 text-sky-700",
  Wallet: "bg-emerald-100 text-emerald-700",
  Kitchen: "bg-amber-100 text-amber-700",
};

export default function AuditLogs() {
  const [logs, setLogs] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => setLogs(await dataStore.load("auditLogs", "audit-logs.json")))();
  }, []);

  const filtered = (logs || [])
    .filter(
      (l) =>
        l.actor.toLowerCase().includes(query.toLowerCase()) ||
        l.action.toLowerCase().includes(query.toLowerCase())
    )
    .slice()
    .reverse();

  const { page, setPage, totalPages, pageItems: pagedLogs } = usePagination(filtered, 10);

  if (!logs) return <Loader full label="Loading audit logs..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Audit Logs</h1>
          <p className="text-sm text-ink-400">
            Every QR scan, login, wallet transaction, and admin action is logged (SRS §26.2.8 / §28.1).
          </p>
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search actor or action..." />
      </div>

      <div className="space-y-2">
        {pagedLogs.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 bg-white p-4 text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-ink-300" />
              <div>
                <p className="font-medium text-ink-800">{l.action}</p>
                <p className="text-xs text-ink-400">by {l.actor}</p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_TONE[l.category] || "bg-ink-100 text-ink-700"}`}>
              {l.category}
            </span>
            <span className="text-xs text-ink-400">{new Date(l.timestamp).toLocaleString()}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
            No matching audit entries.
          </p>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
