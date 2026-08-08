// FILE: src/pages/modules/super-admin/pages/SuperAdminTables.jsx  (MODIFIED, full rewrite)
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { useToast } from "../../../../components/hooks/useToast";
import Badge from "../../../../components/shared/Badge";
import Modal from "../../../../components/shared/Modal";
import FormField from "../../../../components/shared/FormField";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";
import Loader from "../../../../components/shared/Loader";

const STATUS_OPTIONS = ["free", "occupied", "reserved"];

export default function SuperAdminTables() {
  const { push } = useToast();
  const [tables, setTables] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [status, setStatus] = useState("free");

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
    const record = { id: genId("T"), number: Number(number), capacity: Number(capacity), status };
    const next = await dataStore.insert("tables", record);
    setTables(next);
    push(`Table ${number} added as ${status}.`, "success");
    setModalOpen(false);
    setNumber("");
    setCapacity(4);
    setStatus("free");
  }

  async function cycleStatus(t) {
    const nextStatus = STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(t.status) + 1) % STATUS_OPTIONS.length];
    const next = await dataStore.update("tables", (x) => x.id === t.id, { status: nextStatus });
    setTables(next);
  }

  async function removeTable(id) {
    const next = await dataStore.remove("tables", (t) => t.id === id);
    setTables(next);
    push("Table removed.", "success");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Table Management</h1>
          <p className="text-sm text-ink-400">Click a table's status badge to cycle Free → Occupied → Reserved.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Add Table
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {pagedTables.map((t) => (
          <div key={t.id} className="rounded-xl border border-ink-100 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-ink-900">#{t.number}</p>
            <p className="text-xs text-ink-400">Seats {t.capacity}</p>
            <button onClick={() => cycleStatus(t)} className="mt-2">
              <Badge
                tone={t.status === "free" ? "active" : t.status === "occupied" ? "delayed" : "pending"}
              >
                {t.status}
              </Badge>
            </button>
            <button
              onClick={() => removeTable(t.id)}
              className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-brand-600 hover:underline"
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
        ))}
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
          <button className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            Add Table
          </button>
        </form>
      </Modal>
    </div>
  );
}