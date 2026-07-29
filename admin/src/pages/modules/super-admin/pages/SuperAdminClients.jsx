import { useEffect, useState } from "react";
import { UserPlus, Edit2, Ban, Trash2, KeyRound, Eye } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText } from "../../../../components/utils/sanitize";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Modal from "../../../../components/shared/Modal";
import ConfirmDialog from "../../../../components/shared/ConfirmDialog";
import Badge from "../../../../components/shared/Badge";
import SearchInput from "../../../../components/shared/SearchInput";
import Loader from "../../../../components/shared/Loader";

const EMPTY_FORM = {
  name: "",
  employeeId: "",
  department: "",
  designation: "",
  employmentType: "Company Employee",
  mealPlan: "Fixed Company Meal",
  mealBenefit: "Self Paid",
};

export default function SuperAdminClients() {
  const { push } = useToast();
  const [clients, setClients] = useState(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, action }

  useEffect(() => {
    (async () => setClients(await dataStore.load("clients", "clients.json")))();
  }, []);

  if (!clients) return <Loader full label="Loading clients..." />;

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.employeeId.toLowerCase().includes(query.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(client) {
    setEditing(client);
    setForm({ ...EMPTY_FORM, ...client });
    setModalOpen(true);
  }

  async function saveForm(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.employeeId.trim()) {
      push("Name and Employee ID are required.", "error");
      return;
    }
    if (editing) {
      const next = await dataStore.update("clients", (c) => c.id === editing.id, {
        ...form,
        name: sanitizeText(form.name, 100),
      });
      setClients(next);
      push(`${form.name} updated.`, "success");
    } else {
      const record = {
        id: genId("C"),
        ...form,
        name: sanitizeText(form.name, 100),
        walletBalance: 0,
        monthlyBill: 0,
        qrStatus: "active",
        status: "active",
      };
      const next = await dataStore.insert("clients", record);
      setClients(next);
      push(`${record.name} created.`, "success");
    }
    setModalOpen(false);
  }

  async function handleConfirm() {
    if (!confirmTarget) return;
    const { id, action } = confirmTarget;
    if (action === "delete") {
      const next = await dataStore.remove("clients", (c) => c.id === id);
      setClients(next);
      push("Client deleted.", "success");
    } else if (action === "suspend") {
      const next = await dataStore.update("clients", (c) => c.id === id, {
        status: "suspended",
      });
      setClients(next);
      push("Client suspended.", "success");
    } else if (action === "activate") {
      const next = await dataStore.update("clients", (c) => c.id === id, { status: "active" });
      setClients(next);
      push("Client reactivated.", "success");
    } else if (action === "reset") {
      push("Password reset link sent (mock — no email backend yet).", "info");
    }
    setConfirmTarget(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Client Management</h1>
          <p className="text-sm text-ink-400">Create, edit, suspend, or remove client accounts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name or Employee ID..." />
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <UserPlus size={16} /> Create Client
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Employee ID</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Meal Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-ink-800">{c.name}</td>
                <td className="px-4 py-3 text-ink-500">{c.employeeId}</td>
                <td className="px-4 py-3 text-ink-500">{c.department}</td>
                <td className="px-4 py-3 text-ink-500">{c.mealPlan}</td>
                <td className="px-4 py-3">
                  <Badge tone={c.status}>{c.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <IconBtn title="Edit" onClick={() => openEdit(c)}>
                      <Edit2 size={14} />
                    </IconBtn>
                    <IconBtn title="Reset Password" onClick={() => setConfirmTarget({ id: c.id, action: "reset" })}>
                      <KeyRound size={14} />
                    </IconBtn>
                    {c.status === "active" ? (
                      <IconBtn title="Suspend" onClick={() => setConfirmTarget({ id: c.id, action: "suspend" })}>
                        <Ban size={14} />
                      </IconBtn>
                    ) : (
                      <IconBtn title="Reactivate" onClick={() => setConfirmTarget({ id: c.id, action: "activate" })}>
                        <Eye size={14} />
                      </IconBtn>
                    )}
                    <IconBtn
                      title="Delete"
                      danger
                      onClick={() => setConfirmTarget({ id: c.id, action: "delete" })}
                    >
                      <Trash2 size={14} />
                    </IconBtn>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-400">
                  No clients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Client" : "Create Client"}>
        <form onSubmit={saveForm} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" required>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <FormField label="Employee ID" required>
            <input
              value={form.employeeId}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <FormField label="Department">
            <input
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <FormField label="Designation">
            <input
              value={form.designation}
              onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <FormField label="Employment Type">
            <select
              value={form.employmentType}
              onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option>Company Employee</option>
              <option>External Client</option>
              <option>Contractor</option>
              <option>Temporary Employee</option>
            </select>
          </FormField>
          <FormField label="Meal Plan">
            <select
              value={form.mealPlan}
              onChange={(e) => setForm((f) => ({ ...f, mealPlan: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option>Fixed Company Meal</option>
              <option>Custom Menu</option>
              <option>Complimentary Meal</option>
            </select>
          </FormField>
          <FormField label="Meal Benefit" className="sm:col-span-2">
            <select
              value={form.mealBenefit}
              onChange={(e) => setForm((f) => ({ ...f, mealBenefit: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option>Company Subsidized</option>
              <option>Complimentary</option>
              <option>Self Paid</option>
            </select>
          </FormField>
          <div className="sm:col-span-2">
            <button className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
              {editing ? "Save Changes" : "Create Client"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        title={
          confirmTarget?.action === "delete"
            ? "Delete this client?"
            : confirmTarget?.action === "suspend"
            ? "Suspend this client?"
            : confirmTarget?.action === "reset"
            ? "Reset password?"
            : "Reactivate this client?"
        }
        message={
          confirmTarget?.action === "delete"
            ? "This permanently removes the client record from local data."
            : "This action can be reversed later from this same screen."
        }
        confirmLabel="Confirm"
        danger={confirmTarget?.action === "delete" || confirmTarget?.action === "suspend"}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-lg p-2 hover:bg-ink-100 ${danger ? "text-brand-600 hover:bg-brand-50" : "text-ink-500"}`}
    >
      {children}
    </button>
  );
}
