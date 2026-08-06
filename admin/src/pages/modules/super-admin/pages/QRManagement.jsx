import { useEffect, useState } from "react";
import { QrCode, RefreshCcw, Ban, CheckCircle2, AlertTriangle } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import SearchInput from "../../../../components/shared/SearchInput";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

export default function QRManagement() {
  const { push } = useToast();
  const [clients, setClients] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => setClients(await dataStore.load("clients", "clients.json")))();
  }, []);

  const filtered = (clients || []).filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.employeeId.toLowerCase().includes(query.toLowerCase())
  );
  const { page, setPage, totalPages, pageItems: pagedClients } = usePagination(filtered, 10);

  if (!clients) return <Loader full label="Loading QR records..." />;

  async function setStatus(id, qrStatus) {
    const next = await dataStore.update("clients", (c) => c.id === id, { qrStatus });
    setClients(next);
    push(`QR status updated to "${qrStatus}".`, "success");
  }

  async function replaceCard(id) {
    const next = await dataStore.update("clients", (c) => c.id === id, { qrStatus: "active" });
    setClients(next);
    push("New QR card generated to replace the lost/expired one.", "success");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">QR Management</h1>
          <p className="text-sm text-ink-400">Activate, deactivate, or replace client QR cards.</p>
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search name or Employee ID..." />
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-400">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Employee ID</th>
              <th className="px-4 py-3">QR Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {pagedClients.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-ink-800">{c.name}</td>
                <td className="px-4 py-3 text-ink-500">{c.employeeId}</td>
                <td className="px-4 py-3">
                  <Badge tone={c.qrStatus === "active" ? "active" : "expired"}>{c.qrStatus}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {c.qrStatus === "active" ? (
                      <IconBtn title="Deactivate" onClick={() => setStatus(c.id, "expired")}>
                        <Ban size={14} />
                      </IconBtn>
                    ) : (
                      <IconBtn title="Activate" onClick={() => setStatus(c.id, "active")}>
                        <CheckCircle2 size={14} />
                      </IconBtn>
                    )}
                    <IconBtn title="Report Lost / Replace Card" onClick={() => replaceCard(c.id)}>
                      <RefreshCcw size={14} />
                    </IconBtn>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-400">
                  No matching QR records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-4 pb-3" />
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <p>
          QR validation logic (active / expired / suspended checks) is enforced live during Manager
          QR scans — see <code>Manager → Scan QR</code>.
        </p>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title }) {
  return (
    <button onClick={onClick} title={title} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100">
      {children}
    </button>
  );
}
