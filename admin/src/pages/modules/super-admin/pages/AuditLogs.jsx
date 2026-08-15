import { useEffect, useState } from "react";
import { ShieldCheck, CalendarDays } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import Loader from "../../../../components/shared/Loader";
import SearchInput from "../../../../components/shared/SearchInput";
import Pagination, {
  usePagination,
} from "../../../../components/shared/Pagination";

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
    (async () =>
      setLogs(await dataStore.load("auditLogs", "audit-logs.json")))();
  }, []);

  const filtered = (logs || [])
    .filter(
      (l) =>
        l.actor.toLowerCase().includes(query.toLowerCase()) ||
        l.action.toLowerCase().includes(query.toLowerCase())
    )
    .slice()
    .reverse();

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedLogs,
  } = usePagination(filtered, 10);

  if (!logs) return <Loader full label="Loading audit logs..." />;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ShieldCheck size={21} />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
                Audit Logs
              </h1>
              <p className="mt-1 text-xs text-ink-400 sm:text-sm">
                Review system activities and actions.
              </p>
            </div>
          </div>

          <div className="w-full lg:w-80">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search actor or action..."
            />
          </div>
        </div>
      </div>

      {/* Desktop / Tablet Table */}
      <div className="hidden overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/70">
              <tr className="text-xs uppercase tracking-wide text-ink-400">
                <th className="w-[45%] px-5 py-3.5 font-semibold">
                  Action
                </th>

                <th className="w-[20%] px-5 py-3.5 font-semibold">
                  Actor
                </th>

                <th className="w-[17%] px-5 py-3.5 font-semibold">
                  Category
                </th>

                <th className="w-[18%] px-5 py-3.5 font-semibold">
                  Timestamp
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {pagedLogs.map((l) => (
                <tr
                  key={l.id}
                  className="transition hover:bg-ink-50/40"
                >
                  {/* Action */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-400">
                        <ShieldCheck size={16} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-800">
                          {l.action}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Actor */}
                  <td className="px-5 py-4">
                    <span className="font-medium text-ink-700">
                      {l.actor}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        CATEGORY_TONE[l.category] ||
                        "bg-ink-100 text-ink-700"
                      }`}
                    >
                      {l.category}
                    </span>
                  </td>

                  {/* Timestamp */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-xs text-ink-400">
                      <CalendarDays size={14} />
                      <span className="whitespace-nowrap">
                        {new Date(l.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="border-t border-ink-100 px-5 py-12 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ink-50 text-ink-300">
              <ShieldCheck size={20} />
            </div>

            <p className="mt-3 text-sm font-medium text-ink-600">
              No matching audit entries.
            </p>

            <p className="mt-1 text-xs text-ink-400">
              Try searching with a different actor or action.
            </p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 sm:hidden">
        {pagedLogs.map((l) => (
          <div
            key={l.id}
            className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm"
          >
            {/* Action */}
            <div className="flex items-start gap-3 border-b border-ink-100 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-400">
                <ShieldCheck size={17} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-5 text-ink-800">
                  {l.action}
                </p>

                <p className="mt-1 text-xs text-ink-400">
                  by {l.actor}
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 bg-ink-50/40 p-4">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  Category
                </p>

                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    CATEGORY_TONE[l.category] ||
                    "bg-ink-100 text-ink-700"
                  }`}
                >
                  {l.category}
                </span>
              </div>

              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  Timestamp
                </p>

                <div className="flex items-start gap-1.5 text-xs leading-4 text-ink-500">
                  <CalendarDays
                    size={13}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    {new Date(l.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white px-5 py-12 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ink-50 text-ink-300">
              <ShieldCheck size={20} />
            </div>

            <p className="mt-3 text-sm font-medium text-ink-600">
              No matching audit entries.
            </p>

            <p className="mt-1 text-xs text-ink-400">
              Try searching with a different actor or action.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
      />
    </div>
  );
}