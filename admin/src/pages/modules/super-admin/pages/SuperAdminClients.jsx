// FILE: src/pages/modules/super-admin/pages/SuperAdminClients.jsx  (MODIFIED, full rewrite)
import { useEffect, useState } from "react";
import { UserPlus, Edit2, Ban, Trash2, KeyRound, Eye, IdCard, FileDown } from "lucide-react";
import { printBlankRegistrationForm } from "../../../../components/utils/registrationForm";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText, sanitizeEmail } from "../../../../components/utils/sanitize";
import { generatePassword, deriveEmail } from "../../../../components/utils/credentials";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";
import FormField from "../../../../components/shared/FormField";
import Modal from "../../../../components/shared/Modal";
import ConfirmDialog from "../../../../components/shared/ConfirmDialog";
import Badge from "../../../../components/shared/Badge";
import SearchInput from "../../../../components/shared/SearchInput";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";
import Loader from "../../../../components/shared/Loader";
import EmailPreviewModal from "../../../../components/shared/EmailPreviewModal";
import ProfileCardModal from "../../../../components/shared/ProfileCardModal";

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
  const [clients, setClients] = useState(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false); // drives the submit button's transaction animation
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, action }
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [emailPreview, setEmailPreview] = useState(null); // { name, email, password, role, qrToken }
  const [viewing, setViewing] = useState(null); // client being viewed in the profile modal

  useEffect(() => {
    (async () => setClients(await dataStore.load("clients", "clients.json")))();
  }, []);

  const filtered = (clients || []).filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.employeeId.toLowerCase().includes(query.toLowerCase())
  );
  const { page, setPage, totalPages, pageItems: pagedClients } = usePagination(filtered, 10);

  if (!clients) return <Loader full label="Loading clients..." />;

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

    // --- New client: create the profile AND a linked login account ---
    // Everything below (userId, password, QR token) is generated together
    // in one shot so the profile, the login credentials, and the virtual
    // ID card/QR are never out of sync with each other.
    const email = form.email ? sanitizeEmail(form.email) : deriveEmail(cleanName);
    const phone = sanitizeText(form.phone, 20);
    const password = generatePassword();
    const clientId = genId("C");
    const userId = genId("U");

    const clientRecord = {
      id: clientId,
      userId,
      ...form,
      name: cleanName,
      email,
      phone,
      walletBalance: 0,
      monthlyBill: 0,
      qrStatus: "active",
      qrToken: genId("QR"),
      status: "active",
    };
    const userRecord = {
      id: userId,
      name: cleanName,
      email,
      phone,
      password,
      role: "client",
      status: "active",
      department: form.department,
      designation: form.designation,
      employeeId: form.employeeId,
      employmentType: form.employmentType,
      mealPlan: form.mealPlan, // Fixed Company Meal | Custom Menu | Complimentary Meal — read
      mealBenefit: form.mealBenefit, // by PlaceOrder / NewOrder to decide fixed-vs-full menu flow
      defaultPaymentMethod: "wallet",
      avatarColor: "#059669",
    };

    const next = await dataStore.insert("clients", clientRecord);
    setClients(next);
    await dataStore.insert("users", userRecord);

    setSaving(false);
    push(`${cleanName} created — login account ready.`, "success");
    setModalOpen(false);
    // Immediately hand the Super Admin the "send credentials" modal — this
    // is the one-click welcome-email step from the SRS: profile + QR +
    // login all exist the moment this fires.
    setEmailPreview({
      name: cleanName,
      email,
      password,
      role: `Client (${form.mealPlan})`,
      qrToken: clientId,
    });
  }

  async function handleConfirm() {
    if (!confirmTarget) return;
    setConfirmBusy(true);
    const { id, action } = confirmTarget;
    const client = clients.find((c) => c.id === id);

    if (action === "delete") {
      const next = await dataStore.remove("clients", (c) => c.id === id);
      setClients(next);
      if (client?.userId) await dataStore.remove("users", (u) => u.id === client.userId);
      push("Client deleted.", "success");
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
      setEmailPreview({
        name: client.name,
        email: client.email || deriveEmail(client.name),
        password: newPassword,
        role: `Client (${client.mealPlan})`,
      });
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
          <Button variant="secondary" icon={FileDown} onClick={printBlankRegistrationForm}>
            Blank Registration Form
          </Button>
          <Button variant="primary" icon={UserPlus} onClick={openCreate}>
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
                    <Button variant="icon" title="View Profile" onClick={() => setViewing(c)}>
                      <IdCard size={14} />
                    </Button>
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
                        <Eye size={14} />
                      </Button>
                    )}
                    <Button
                      variant="icon"
                      title="Delete"
                      className="hover:text-brand-600 hover:bg-brand-50"
                      onClick={() => setConfirmTarget({ id: c.id, action: "delete" })}
                    >
                      <Trash2 size={14} />
                    </Button>
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
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" fullWidth loading={saving}>
              {editing ? "Save Changes" : "Create Client & Send Credentials"}
            </Button>
          </div>
        </form>
      </Modal>

      <ProfileCardModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        person={viewing}
        role="Client"
        qrValue={viewing ? JSON.stringify({ clientId: viewing.id, employeeId: viewing.employeeId, status: viewing.qrStatus }) : ""}
      />

      <EmailPreviewModal
        open={!!emailPreview}
        onClose={() => setEmailPreview(null)}
        {...(emailPreview || {})}
      />

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
            ? "This permanently removes the client record and their login account."
            : confirmTarget?.action === "reset"
            ? "A new password will be generated and shown for you to share with the client."
            : "This action can be reversed later from this same screen."
        }
        confirmLabel="Confirm"
        danger={confirmTarget?.action === "delete" || confirmTarget?.action === "suspend"}
        busy={confirmBusy}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}