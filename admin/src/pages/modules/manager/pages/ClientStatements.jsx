// FILE: src/pages/modules/manager/pages/ClientStatements.jsx (NEW — client picker + the shared StatementView)
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

  if (!clients || !orders) return <Loader full label="Loading clients..." />;

  const filtered = clients.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.employeeId?.toLowerCase().includes(query.toLowerCase())
  );
  const selected = clients.find((c) => c.id === selectedId);
  const selectedOrders = selected
    ? orders.filter((o) => o.clientId === selected.id || o.clientName === selected.name)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Client Statements</h1>
        <p className="text-sm text-ink-400">Pick a client to view their Monthly Statement — identical to what they see.</p>
      </div>

      {!selected ? (
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <div className="relative mb-3">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search client by name or Employee ID..."
              className="w-full rounded-lg border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="space-y-1">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-ink-50"
              >
                <span className="flex items-center gap-2">
                  <Users size={14} className="text-ink-400" />
                  <span className="font-medium text-ink-800">{c.name}</span>
                </span>
                <span className="text-xs text-ink-400">{c.employeeId} · {c.department}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No matching clients.</p>}
          </div>
        </div>
      ) : (
        <div>
          <button onClick={() => setSelectedId(null)} className="mb-4 text-xs font-semibold text-brand-600 hover:underline">
            ← Choose a different client
          </button>
          <StatementView
            client={selected}
            orders={selectedOrders}
            periodStorageKey={`cccms:manager-statement-period:${selected.id}`}
            // Manager doesn't have a client-facing order-detail route to
            // link to yet — omit onViewOrder for now (no eye-icon click
            // action) rather than link somewhere wrong.
          />
        </div>
      )}
    </div>
  );
}