// FILE: src/pages/modules/super-admin/pages/SuperAdminClients.jsx  (MODIFIED, full rewrite)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Edit2, Ban, Trash2, KeyRound, IdCard, RotateCcw, Archive } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { sanitizeText, sanitizeEmail } from "../../../../components/utils/sanitize";
import { generatePassword, deriveEmail } from "../../../../components/utils/credentials";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";
import FormField from "../../../../components/shared/FormField";
import Badge from "../../../../components/shared/Badge";
import SearchInput from "../../../../components/shared/SearchInput";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";
import Loader from "../../../../components/shared/Loader";

const EMPTY_FORM = {
  name: "",
  employeeId: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  employmentType: "Company Employee",
  mealPlan: "Fixed Company Meal",
  mealBenefit: "Self Paid",
};

export default function SuperAdminClients() {
  const { push } = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState(null);
  const [query, setQuery] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, action } — inline confirm bar, no modal
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    (async () => setClients(await dataStore.load("clients", "clients.json")))();
  }, []);

  const filtered = (clients || []).filter(
    (c) =>
      (showArchived ? c.status === "archived" : c.status !== "archived") &&
      (c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.employeeId.toLowerCase().includes(query.toLowerCase()))
  );
  const { page, setPage, totalPages, pageItems: pagedClients } = usePagination(filtered, 10);

  if (!clients) return <Loader full label="Loading clients..." />;

  function openEdit(client) {
    setEditing(client);
    setForm({ ...EMPTY_FORM, ...client });
    setEditOpen(true);
  }

  async function saveForm(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.employeeId.trim()) {
      push("Name and Employee ID are required.", "error");
      return;
    }
    setSaving(true);
    const cleanName = sanitizeText(form.name, 100);

    if (editing) {
      const next = await dataStore.update("clients", (c) => c.id === editing.id, {
        ...form,
        name: cleanName,
      });
      setClients(next);
      // Keep the linked login account's display name/email/phone in sync —
      // this is the SAME account the client logs in with, so a profile edit
      // here must never drift from what ScanQR/Login/etc. reads later.
      await dataStore.update("users", (u) => u.id === editing.userId, {
        name: cleanName,
        email: form.email ? sanitizeEmail(form.email) : undefined,
        phone: sanitizeText(form.phone, 20),
      });
      setSaving(false);
      push(`${cleanName} updated.`, "success");
      setModalOpen(false);
      return;
    }

    setSaving(false);
  }

  async function handleConfirm() {
    if (!confirmTarget) return;
    setConfirmBusy(true);
    const { id, action } = confirmTarget;
    const client = clients.find((c) => c.id === id);

    if (action === "delete") {
      // Soft-delete: archive instead of remove, so it can be restored from
      // the Recycle Bin view later. The login account is deactivated too,
      // but neither record is actually erased.
      const next = await dataStore.update("clients", (c) => c.id === id, { status: "archived", prevStatus: client.status });
      setClients(next);
      if (client?.userId) await dataStore.update("users", (u) => u.id === client.userId, { status: "suspended" });
      push("Client moved to Recycle Bin — restore anytime.", "success");
    } else if (action === "restore") {
      const next = await dataStore.update("clients", (c) => c.id === id, { status: client.prevStatus || "active" });
      setClients(next);
      if (client?.userId) await dataStore.update("users", (u) => u.id === client.userId, { status: "active" });
      push("Client restored.", "success");
    } else if (action === "suspend") {
      const next = await dataStore.update("clients", (c) => c.id === id, { status: "suspended" });
      setClients(next);
      if (client?.userId) await dataStore.update("users", (u) => u.id === client.userId, { status: "suspended" });
      push("Client suspended.", "success");
    } else if (action === "activate") {
      const next = await dataStore.update("clients", (c) => c.id === id, { status: "active" });
      setClients(next);
      if (client?.userId) await dataStore.update("users", (u) => u.id === client.userId, { status: "active" });
      push("Client reactivated.", "success");
    } else if (action === "reset") {
      const newPassword = generatePassword();
      if (client?.userId) await dataStore.update("users", (u) => u.id === client.userId, { password: newPassword });
      setConfirmBusy(false);
      setConfirmTarget(null);
      navigate(`/app/super-admin/welcome-email/${client.userId}`, {
        state: { name: client.name, email: client.email || deriveEmail(client.name), password: newPassword, role: `Client (${client.mealPlan})` },
      });
      return;
    }
    setConfirmBusy(false);
    setConfirmTarget(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Client Management</h1>
          <p className="text-sm text-ink-400">
            Create a client and their login account, virtual ID card, and QR are generated together.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name or Employee ID..." />
          <Button
            variant="secondary"
            icon={Archive}
            onClick={() => setShowArchived((s) => !s)}
          >
            {showArchived ? "Show Active" : "Recycle Bin"}
          </Button>
          <Button variant="primary" icon={UserPlus} onClick={() => navigate("/app/super-admin/clients/new")}>
            Create Client
          </Button>
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
            {pagedClients.map((c) => (
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
                    <Button variant="icon" title="View Profile" onClick={() => navigate(`/app/super-admin/clients/${c.id}`)}>
                      <IdCard size={14} />
                    </Button>
                    {c.status === "archived" ? (
                      <Button variant="icon" title="Restore" onClick={() => setConfirmTarget({ id: c.id, action: "restore" })}>
                        <RotateCcw size={14} />
                      </Button>
                    ) : (
                      <>
                        <Button variant="icon" title="Edit" onClick={() => openEdit(c)}>
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="icon" title="Reset Password" onClick={() => setConfirmTarget({ id: c.id, action: "reset" })}>
                          <KeyRound size={14} />
                        </Button>
                        {c.status === "active" ? (
                          <Button variant="icon" title="Suspend" onClick={() => setConfirmTarget({ id: c.id, action: "suspend" })}>
                            <Ban size={14} />
                          </Button>
                        ) : (
                          <Button variant="icon" title="Reactivate" onClick={() => setConfirmTarget({ id: c.id, action: "activate" })}>
                            <RotateCcw size={14} />
                          </Button>
                        )}
                        <Button
                          variant="icon"
                          title="Delete (moves to Recycle Bin)"
                          className="hover:text-brand-600 hover:bg-brand-50"
                          onClick={() => setConfirmTarget({ id: c.id, action: "delete" })}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </>
                    )}
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
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-4 pb-3" />
      </div>

      {editOpen && (
      <div className="rounded-xl border border-ink-100 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-ink-900">Edit Client</h2>
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
          <FormField label="Email" hint="Leave blank to auto-generate from the name">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <FormField label="Phone">
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
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
          <FormField label="Meal Plan" hint="Controls whether they see the fixed daily meal or the full menu at order time">
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
          <div className="sm:col-span-2">
            <FormField label="Meal Benefit">
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
          </div>
                    <div className="flex gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth loading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
      )}

      {/* Inline confirm bar — replaces the modal confirm dialog */}
      {confirmTarget && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-white p-4 shadow-2xl sm:left-72">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-ink-700">
              {confirmTarget.action === "delete" && "Move this client to the Recycle Bin?"}
              {confirmTarget.action === "restore" && "Restore this client from the Recycle Bin?"}
              {confirmTarget.action === "suspend" && "Suspend this client?"}
              {confirmTarget.action === "activate" && "Reactivate this client?"}
              {confirmTarget.action === "reset" && "Reset this client's password?"}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setConfirmTarget(null)} disabled={confirmBusy}>
                Cancel
              </Button>
              <Button
                variant={confirmTarget.action === "delete" ? "danger" : "primary"}
                onClick={handleConfirm}
                loading={confirmBusy}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}