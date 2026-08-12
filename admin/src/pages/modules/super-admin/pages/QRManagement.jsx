// FILE: src/pages/modules/super-admin/pages/QRManagement.jsx  (MODIFIED, full rewrite)
import { useEffect, useState } from "react";
import { RefreshCcw, Ban, CheckCircle2, AlertTriangle, Maximize2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { useToast } from "../../../../components/hooks/useToast";
import Badge from "../../../../components/shared/Badge";
import Modal from "../../../../components/shared/Modal";
import ConfirmDialog from "../../../../components/shared/ConfirmDialog";
import Loader from "../../../../components/shared/Loader";
import SearchInput from "../../../../components/shared/SearchInput";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

export default function QRManagement() {
  const { push } = useToast();
  const [clients, setClients] = useState(null);
  const [query, setQuery] = useState("");
  const [zoomed, setZoomed] = useState(null); // client shown large in a modal
  const [replaceTarget, setReplaceTarget] = useState(null); // client pending "replace" confirmation

  useEffect(() => {
    (async () => setClients(await dataStore.load("clients", "clients.json")))();
  }, []);

  const filtered = (clients || []).filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.employeeId.toLowerCase().includes(query.toLowerCase())
  );
  const { page, setPage, totalPages, pageItems: pagedClients } = usePagination(filtered, 8);

  if (!clients) return <Loader full label="Loading QR records..." />;

  function qrValueFor(c) {
    return JSON.stringify({ clientId: c.id, employeeId: c.employeeId, status: c.qrStatus, qrToken: c.qrToken });
  }

  async function setStatus(id, qrStatus) {
    const next = await dataStore.update("clients", (c) => c.id === id, { qrStatus });
    setClients(next);
    push(`QR status updated to "${qrStatus}".`, "success");
  }

  async function confirmReplace() {
    if (!replaceTarget) return;
    // A genuinely new token — any old printed/saved QR (which encodes the
    // previous token) will now fail the Manager's scan-time token check.
    const newToken = genId("QR");
    const next = await dataStore.update("clients", (c) => c.id === replaceTarget.id, {
      qrToken: newToken,
      qrStatus: "active",
    });
    setClients(next);
    push(`New QR generated for ${replaceTarget.name} — the old card no longer works.`, "success");
    setReplaceTarget(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">QR Management</h1>
          <p className="text-sm text-ink-400">View, activate/deactivate, or replace any client's QR card.</p>
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search name or Employee ID..." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pagedClients.map((c) => (
          <div key={c.id} className="rounded-xl border border-ink-100 bg-white p-4 text-center">
            <button
              onClick={() => setZoomed(c)}
              className="group relative mx-auto flex w-fit items-center justify-center rounded-lg border border-ink-100 p-2 hover:border-brand-300"
              title="View larger"
            >
              <QRCodeSVG value={qrValueFor(c)} size={96} level="M" />
              <span className="absolute inset-0 flex items-center justify-center bg-white/80 opacity-0 transition-opacity group-hover:opacity-100">
                <Maximize2 size={18} className="text-brand-600" />
              </span>
            </button>
            <p className="mt-2 truncate text-sm font-semibold text-ink-900">{c.name}</p>
            <p className="text-xs text-ink-400">{c.employeeId}</p>
            <div className="mt-2 flex justify-center">
              <Badge tone={c.qrStatus === "active" ? "active" : "expired"}>{c.qrStatus}</Badge>
            </div>
            <div className="mt-3 flex justify-center gap-1">
              {c.qrStatus === "active" ? (
                <IconBtn title="Deactivate" onClick={() => setStatus(c.id, "expired")}>
                  <Ban size={14} />
                </IconBtn>
              ) : (
                <IconBtn title="Activate" onClick={() => setStatus(c.id, "active")}>
                  <CheckCircle2 size={14} />
                </IconBtn>
              )}
              <IconBtn title="Report Lost / Generate New QR" onClick={() => setReplaceTarget(c)}>
                <RefreshCcw size={14} />
              </IconBtn>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-ink-400">No matching QR records.</p>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <p>
          Generating a new QR immediately invalidates the old one — a Manager scanning the
          previous printed card will now see "Invalid QR Code".
        </p>
      </div>

      <Modal open={!!zoomed} onClose={() => setZoomed(null)} title={zoomed?.name || "QR Card"} size="sm">
        {zoomed && (
          <div className="text-center">
            <div className="mx-auto flex w-fit justify-center rounded-lg border border-ink-100 p-3">
              <QRCodeSVG value={qrValueFor(zoomed)} size={220} level="M" />
            </div>
            <p className="mt-3 font-semibold text-ink-900">{zoomed.employeeId}</p>
            <p className="text-xs text-ink-400">{zoomed.department}</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!replaceTarget}
        title="Generate a new QR card?"
        message={`This immediately invalidates ${replaceTarget?.name || "this client"}'s current QR card. Use this after a lost-card report.`}
        confirmLabel="Generate New QR"
        danger
        onConfirm={confirmReplace}
        onCancel={() => setReplaceTarget(null)}
      />
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