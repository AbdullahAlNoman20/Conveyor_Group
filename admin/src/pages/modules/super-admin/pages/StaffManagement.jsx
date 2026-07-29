import { useEffect, useState } from "react";
import { UserPlus, Ban, CheckCircle2, Trash2 } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText, sanitizeEmail } from "../../../../components/utils/sanitize";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Modal from "../../../../components/shared/Modal";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";

/**
 * Reused for both:
 *  - Super Admin -> Manager Management (SRS 12.3.2)
 *  - Super Admin -> Kitchen Staff Management (SRS 12.3.3)
 * The only differences between the two are the storage key, seed file, and labels.
 */
export default function StaffManagement({ title, storageKey, seedFile, idPrefix, showEmail = true, roleField }) {
  const { push } = useToast();
  const [staff, setStaff] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "" });

  useEffect(() => {
    (async () => setStaff(await dataStore.load(storageKey, seedFile)))();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  if (!staff) return <Loader full label={`Loading ${title.toLowerCase()}...`} />;

  async function create(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      push("Name is required.", "error");
      return;
    }
    const record = {
      id: genId(idPrefix),
      name: sanitizeText(form.name, 100),
      ...(showEmail ? { email: sanitizeEmail(form.email) } : {}),
      ...(roleField ? { role: form.role || "Staff" } : {}),
      status: "active",
    };
    const next = await dataStore.insert(storageKey, record);
    setStaff(next);
    push(`${record.name} added.`, "success");
    setModalOpen(false);
    setForm({ name: "", email: "", role: "" });
  }

  async function toggleStatus(id, current) {
    const next = await dataStore.update(storageKey, (s) => s.id === id, {
      status: current === "active" ? "disabled" : "active",
    });
    setStaff(next);
  }

  async function remove(id) {
    const next = await dataStore.remove(storageKey, (s) => s.id === id);
    setStaff(next);
    push("Removed.", "success");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
          <p className="text-sm text-ink-400">Create, enable/disable, or remove {title.toLowerCase()} accounts.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <UserPlus size={16} /> Add
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              {showEmail && <th className="px-4 py-3">Email</th>}
              {roleField && <th className="px-4 py-3">Role</th>}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {staff.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-ink-800">{s.name}</td>
                {showEmail && <td className="px-4 py-3 text-ink-500">{s.email}</td>}
                {roleField && <td className="px-4 py-3 text-ink-500">{s.role}</td>}
                <td className="px-4 py-3">
                  <Badge tone={s.status === "active" ? "active" : "cancelled"}>{s.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => toggleStatus(s.id, s.status)}
                      className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
                      title={s.status === "active" ? "Disable" : "Enable"}
                    >
                      {s.status === "active" ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                    </button>
                    <button
                      onClick={() => remove(s.id)}
                      className="rounded-lg p-2 text-brand-600 hover:bg-brand-50"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-400">
                  No records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Add ${title.slice(0, -11) || title}`} size="sm">
        <form onSubmit={create} className="space-y-4">
          <FormField label="Name" required>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          {showEmail && (
            <FormField label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
          )}
          {roleField && (
            <FormField label="Role">
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="Kitchen Head">Kitchen Head</option>
                <option value="Cook">Cook</option>
                <option value="Helper">Helper</option>
              </select>
            </FormField>
          )}
          <button className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            Save
          </button>
        </form>
      </Modal>
    </div>
  );
}
