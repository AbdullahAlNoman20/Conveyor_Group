// FULL CODE — src/pages/modules/super-admin/pages/ClientStatements.jsx (NEW)
import { useState } from "react";
import { Search, Users } from "lucide-react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import StatementView from "../../../../components/shared/StatementView";
import Loader from "../../../../components/shared/Loader";

export default function ClientStatements() {
  const clients = useLiveCollection("clients", "clients.json");
  const orders = useLiveCollection("orders", "orders.json");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  if (!clients || !orders) {
    return <Loader full label="Loading clients..." />;
  }

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.employeeId?.toLowerCase().includes(query.toLowerCase()),
  );

  const selected = clients.find((c) => c.id === selectedId);

  const selectedOrders = selected
    ? orders.filter(
        (o) => o.clientId === selected.id || o.clientName === selected.name,
      )
    : [];

  return (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
          Client Statements
        </h1>

        <p className="mt-1 max-w-2xl text-sm leading-5 text-ink-400">
          Pick a client to view their Monthly Statement — identical to what they
          see.
        </p>
      </div>

      {!selected ? (
        <div className="min-w-0 overflow-hidden rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
          <div className="relative mb-3">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search client by name or Employee ID..."
              className="w-full min-w-0 rounded-lg border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none transition   focus:ring-brand-100"
            />
          </div>

          <div className="space-y-1">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-ink-50"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <Users size={14} className="shrink-0 text-ink-400" />

                  <span className="min-w-0 truncate font-medium text-ink-800">
                    {c.name}
                  </span>
                </span>

                <span className="hidden max-w-[45%] shrink-0 truncate text-xs text-ink-400 sm:block">
                  {c.employeeId} · {c.department}
                </span>
              </button>
            ))}

            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-400">
                No matching clients.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="min-w-0">
          <button
            onClick={() => setSelectedId(null)}
            className="mb-4 inline-flex min-h-9 items-center text-xs font-semibold text-brand-600 hover:underline"
          >
            ← Choose a different client
          </button>

          <div className="min-w-0 overflow-hidden">
            <StatementView
              client={selected}
              orders={selectedOrders}
              periodStorageKey={`cccms:super-admin-statement-period:${selected.id}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
