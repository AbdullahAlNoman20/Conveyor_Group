import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Ban, CheckCircle2, Trash2, KeyRound, IdCard } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { generatePassword, deriveEmail } from "../../../../components/utils/credentials";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

// storageKey drives which query param StaffForm/StaffProfileView expect
// ("managers" or "kitchen-staff") — see SuperAdminRoutes.jsx wiring.
export default function StaffManagement({ title, storageKey, seedFile, idPrefix, showEmail = true, roleField, loginRole, routeType }) {
  const { push } = useToast();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, action }
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    (async () => setStaff(await dataStore.load(storageKey, seedFile)))();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const { page, setPage, totalPages, pageItems: pagedStaff } = usePagination(staff || [], 10);

  if (!staff) return <Loader full label={`Loading ${title.toLowerCase()}...`} />;

  async function runConfirmed() {
    if (!confirmTarget) return;
    setConfirmBusy(true);
    const { id, action } = confirmTarget;
    const person = staff.find((s) => s.id === id);

    if (action === "toggle") {
      const nextStatus = person.status === "active" ? "disabled" : "active";
      const next = await dataStore.update(storageKey, (s) => s.id === id, { status: nextStatus });
      setStaff(next);
      if (person?.userId) await dataStore.update("users", (u) => u.id === person.userId, { status: nextStatus === "disabled" ? "suspended" : "active" });
      push(`${person.name} ${nextStatus === "disabled" ? "disabled" : "enabled"}.`, "success");
    } else if (action === "delete") {
      const next = await dataStore.remove(storageKey, (s) => s.id === id);
      setStaff(next);
      if (person?.userId) await dataStore.remove("users", (u) => u.id === person.userId);
      push(`${person.name} removed.`, "success");
    } else if (action === "reset") {
      const newPassword = generatePassword();
      if (person.userId) await dataStore.update("users", (u) => u.id === person.userId, { password: newPassword });
      setConfirmBusy(false);
      setConfirmTarget(null);
      navigate(`/app/super-admin/welcome-email/${person.userId}`, {
        state: { name: person.name, email: person.email || deriveEmail(person.name), password: newPassword, role: person.role || title.replace(" Management", "") },
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
          <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
          <p className="text-sm text-ink-400">Create, enable/disable, or remove {title.toLowerCase()} accounts.</p>
        </div>
        <Button variant="primary" icon={UserPlus} onClick={() => navigate(`/app/super-admin/staff/new?type=${routeType}`)}>
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
                    <Button variant="icon" title="View Profile" onClick={() => navigate(`/app/super-admin/staff/${s.id}?type=${routeType}`)}>
                      <IdCard size={14} />
                    </Button>
                    <Button variant="icon" title="Reset Password" onClick={() => setConfirmTarget({ id: s.id, action: "reset" })}>
                      <KeyRound size={14} />
                    </Button>
                    <Button variant="icon" title={s.status === "active" ? "Disable" : "Enable"} onClick={() => setConfirmTarget({ id: s.id, action: "toggle" })}>
                      {s.status === "active" ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                    </Button>
                    <Button variant="icon" title="Delete" className="hover:text-brand-600 hover:bg-brand-50" onClick={() => setConfirmTarget({ id: s.id, action: "delete" })}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-400">No records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-4 pb-3" />
      </div>

      {confirmTarget && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-white p-4 shadow-2xl sm:left-72">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-ink-700">
              {confirmTarget.action === "delete" && "Remove this account? This is permanent."}
              {confirmTarget.action === "toggle" && "Change this account's status?"}
              {confirmTarget.action === "reset" && "Reset this account's password?"}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setConfirmTarget(null)} disabled={confirmBusy}>Cancel</Button>
              <Button variant={confirmTarget.action === "delete" ? "danger" : "primary"} onClick={runConfirmed} loading={confirmBusy}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}