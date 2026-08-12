// FILE: src/pages/modules/super-admin/pages/StaffManagement.jsx  (MODIFIED, full rewrite)
import { useEffect, useState } from "react";
import { UserPlus, Ban, CheckCircle2, Trash2, KeyRound, IdCard } from "lucide-react";
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
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";
import EmailPreviewModal from "../../../../components/shared/EmailPreviewModal";
import ProfileCardModal from "../../../../components/shared/ProfileCardModal";

/**
 * Reused for both:
 *  - Super Admin -> Manager Management (SRS 12.3.2)
 *  - Super Admin -> Kitchen Staff Management (SRS 12.3.3)
 * `loginRole` ("manager" | "kitchen_head") controls which role the linked
 * login account gets — every staff member created here gets both a staff
 * profile record AND a real login account, same pattern as Client
 * Management (SuperAdminClients.jsx), so credential emailing / password
 * reset / suspend behave identically across every "manage people" screen.
 *
 * Delete/Disable were previously instant single-click actions with no
 * confirmation — per client direction ("সব কিছু কনফার্ম করবে"), every
 * destructive or account-affecting action now routes through the shared
 * ConfirmDialog first.
 */
export default function StaffManagement({ title, storageKey, seedFile, idPrefix, showEmail = true, roleField, loginRole }) {
  const { push } = useToast();
  const [staff, setStaff] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "" });
  const [creating, setCreating] = useState(false); // "Save & Send Credentials" button transaction state
  const [emailPreview, setEmailPreview] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, action: "toggle" | "delete" | "reset" }
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    (async () => setStaff(await dataStore.load(storageKey, seedFile)))();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const { page, setPage, totalPages, pageItems: pagedStaff } = usePagination(staff || [], 10);

  if (!staff) return <Loader full label={`Loading ${title.toLowerCase()}...`} />;

  async function create(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      push("Name is required.", "error");
      return;
    }
    setCreating(true);
    const cleanName = sanitizeText(form.name, 100);
    const email = form.email ? sanitizeEmail(form.email) : deriveEmail(cleanName);
    const password = generatePassword();
    const staffId = genId(idPrefix);
    const userId = genId("U");

    const record = {
      id: staffId,
      userId,
      name: cleanName,
      email,
      ...(roleField ? { role: form.role || "Staff" } : {}),
      status: "active",
    };
    const userRecord = {
      id: userId,
      name: cleanName,
      email,
      password,
      role: loginRole, // "manager" | "kitchen_head" — read by AuthContext.login() at sign-in time
      status: "active",
      designation: roleField ? form.role || "Staff" : title.replace(" Management", ""),
      avatarColor: loginRole === "manager" ? "#eb2a2d" : "#d97706",
    };

    const next = await dataStore.insert(storageKey, record);
    setStaff(next);
    await dataStore.insert("users", userRecord);

    setCreating(false);
    push(`${cleanName} added — login account ready.`, "success");
    setModalOpen(false);
    setForm({ name: "", email: "", role: "" });
    // Hand off straight into the same welcome-email flow used by
    // SuperAdminClients.jsx, so Manager/Kitchen Staff creation feels
    // identical to Client creation from the admin's point of view.
    setEmailPreview({
      name: cleanName,
      email,
      password,
      role: roleField ? form.role || "Staff" : title.replace(" Management", ""),
    });
  }

  async function runConfirmed() {
    if (!confirmTarget) return;
    setConfirmBusy(true);
    const { id, action } = confirmTarget;
    const person = staff.find((s) => s.id === id);

    if (action === "toggle") {
      const nextStatus = person.status === "active" ? "disabled" : "active";
      const next = await dataStore.update(storageKey, (s) => s.id === id, { status: nextStatus });
      setStaff(next);
      if (person?.userId) {
        // Keep the linked login account's own status (used by AuthContext
        // to block sign-in) in lockstep with the staff record's status.
        await dataStore.update("users", (u) => u.id === person.userId, {
          status: nextStatus === "disabled" ? "suspended" : "active",
        });
      }
      push(`${person.name} ${nextStatus === "disabled" ? "disabled" : "enabled"}.`, "success");
    } else if (action === "delete") {
      const next = await dataStore.remove(storageKey, (s) => s.id === id);
      setStaff(next);
      if (person?.userId) await dataStore.remove("users", (u) => u.id === person.userId);
      push(`${person.name} removed.`, "success");
    } else if (action === "reset") {
      const newPassword = generatePassword();
      if (person.userId) await dataStore.update("users", (u) => u.id === person.userId, { password: newPassword });
      setEmailPreview({
        name: person.name,
        email: person.email || deriveEmail(person.name),
        password: newPassword,
        role: person.role || title.replace(" Management", ""),
      });
    }
    setConfirmBusy(false);
    setConfirmTarget(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
          <p className="text-sm text-ink-400">Create, enable/disable, or remove {title.toLowerCase()} accounts.</p>
        </div>
        <Button variant="primary" icon={UserPlus} onClick={() => setModalOpen(true)}>
          Add
        </Button>
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
            {pagedStaff.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-ink-800">{s.name}</td>
                {showEmail && <td className="px-4 py-3 text-ink-500">{s.email}</td>}
                {roleField && <td className="px-4 py-3 text-ink-500">{s.role}</td>}
                <td className="px-4 py-3">
                  <Badge tone={s.status === "active" ? "active" : "cancelled"}>{s.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="icon" title="View Profile" onClick={() => setViewing(s)}>
                      <IdCard size={14} />
                    </Button>
                    <Button
                      variant="icon"
                      title="Reset Password"
                      onClick={() => setConfirmTarget({ id: s.id, action: "reset" })}
                    >
                      <KeyRound size={14} />
                    </Button>
                    <Button
                      variant="icon"
                      title={s.status === "active" ? "Disable" : "Enable"}
                      onClick={() => setConfirmTarget({ id: s.id, action: "toggle" })}
                    >
                      {s.status === "active" ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                    </Button>
                    <Button
                      variant="icon"
                      title="Delete"
                      className="hover:text-brand-600 hover:bg-brand-50"
                      onClick={() => setConfirmTarget({ id: s.id, action: "delete" })}
                    >
                      <Trash2 size={14} />
                    </Button>
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
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-4 pb-3" />
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
            <FormField label="Email" hint="Leave blank to auto-generate from the name">
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
          <Button type="submit" variant="primary" fullWidth loading={creating}>
            Save & Send Credentials
          </Button>
        </form>
      </Modal>

      <ProfileCardModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        person={viewing}
        role={viewing?.role || title.replace(" Management", "")}
        qrValue={viewing ? JSON.stringify({ staffId: viewing.id, role: loginRole }) : ""}
      />

      <EmailPreviewModal open={!!emailPreview} onClose={() => setEmailPreview(null)} {...(emailPreview || {})} />

      <ConfirmDialog
        open={!!confirmTarget}
        title={
          confirmTarget?.action === "delete"
            ? "Remove this account?"
            : confirmTarget?.action === "reset"
            ? "Reset password?"
            : "Change account status?"
        }
        message={
          confirmTarget?.action === "delete"
            ? "This permanently removes the profile and its login account."
            : confirmTarget?.action === "reset"
            ? "A new password will be generated and shown for you to share with them."
            : "Disabling blocks them from signing in; you can re-enable this later from the same screen."
        }
        confirmLabel="Confirm"
        danger={confirmTarget?.action === "delete"}
        busy={confirmBusy}
        onConfirm={runConfirmed}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}