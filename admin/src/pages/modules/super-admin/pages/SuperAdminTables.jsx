// FILE: src/pages/modules/super-admin/pages/SuperAdminTables.jsx  (MODIFIED, full rewrite)
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";
import Badge from "../../../../components/shared/Badge";
import Modal from "../../../../components/shared/Modal";
import ConfirmDialog from "../../../../components/shared/ConfirmDialog";
import FormField from "../../../../components/shared/FormField";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";
import Loader from "../../../../components/shared/Loader";

const STATUS_OPTIONS = ["free", "occupied", "reserved"];

/**
 * Table status is now a proper dropdown (previously it only cycled through
 * free -> occupied -> reserved -> free on click, which meant reaching
 * "reserved" required clicking through "occupied" first even when the
 * admin just wanted to mark a table reserved directly). New tables still
 * default to "free" per the original behavior, but every status change —
 * new or existing — goes through the same explicit select + confirm.
 */
export default function SuperAdminTables() {
  const { push } = useToast();
  const [tables, setTables] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [status, setStatus] = useState("free");
  const [creating, setCreating] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null); // table being re-statused
  const [nextStatus, setNextStatus] = useState("free");
  const [statusBusy, setStatusBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    (async () => setTables(await dataStore.load("tables", "tables.json")))();
  }, []);

  const { page, setPage, totalPages, pageItems: pagedTables } = usePagination(tables || [], 12);

  if (!tables) return <Loader full label="Loading tables..." />;

  async function addTable(e) {
    e.preventDefault();
    if (!number) {
      push("Table number is required.", "error");
      return;
    }
    setCreating(true);
    const record = { id: genId("T"), number: Number(number), capacity: Number(capacity), status };
    const next = await dataStore.insert("tables", record);
    setTables(next);
    setCreating(false);
    push(`Table ${number} added as ${status}.`, "success");
    setModalOpen(false);
    setNumber("");
    setCapacity(4);
    setStatus("free");
  }

  function openStatusChange(table) {
    setStatusTarget(table);
    setNextStatus(table.status);
  }

  async function confirmStatusChange() {
    setStatusBusy(true);
    const next = await dataStore.update("tables", (t) => t.id === statusTarget.id, { status: nextStatus });
    setTables(next);
    setStatusBusy(false);
    push(`Table ${statusTarget.number} marked as ${nextStatus}.`, "success");
    setStatusTarget(null);
  }

  async function confirmDelete() {
    setDeleteBusy(true);
    const next = await dataStore.remove("tables", (t) => t.id === deleteTarget.id);
    setTables(next);
    setDeleteBusy(false);
    push(`Table ${deleteTarget.number} removed.`, "success");
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Table Management</h1>
          <p className="text-sm text-ink-400">Click a table's status badge to change Free / Occupied / Reserved.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setModalOpen(true)}>
          Add Table
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {pagedTables.map((t) => (
          <div key={t.id} className="rounded-xl border border-ink-100 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-ink-900">#{t.number}</p>
            <p className="text-xs text-ink-400">Seats {t.capacity}</p>
            <button onClick={() => openStatusChange(t)} className="mt-2">
              <Badge tone={t.status === "free" ? "active" : t.status === "occupied" ? "delayed" : "pending"}>
                {t.status}
              </Badge>
            </button>
            <button
              onClick={() => setDeleteTarget(t)}
              className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-brand-600 hover:underline"
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
        ))}
        {tables.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-ink-400">No tables added yet.</p>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Table" size="sm">
        <form onSubmit={addTable} className="space-y-4">
          <FormField label="Table Number" required>
            <input
              type="number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <FormField label="Capacity" required>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <FormField label="Initial Status" required>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm capitalize outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </FormField>
          <Button type="submit" variant="primary" fullWidth loading={creating}>
            Add Table
          </Button>
        </form>
      </Modal>

      <Modal open={!!statusTarget} onClose={() => setStatusTarget(null)} title={`Table #${statusTarget?.number} — Status`} size="sm">
        <FormField label="New Status" required>
          <select
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value)}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm capitalize outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
        </FormField>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setStatusTarget(null)} disabled={statusBusy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmStatusChange} loading={statusBusy}>
            Update Status
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove this table?"
        message={`Table #${deleteTarget?.number} will no longer be selectable for Dine-In orders.`}
        danger
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}