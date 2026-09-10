// admin/src/pages/modules/super-admin/pages/StaffManagement.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Ban, CheckCircle2, Trash2, KeyRound } from "lucide-react";
import { apiDelete, apiPost } from "../../../../components/services/api";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

// Managers are the only staff type. The old "kitchen-staff" variant had no
// seed file, no nav link and no role gate, so it was unreachable.
export default function StaffManagement({ title = "Manager Management" }) {
  const { push } = useToast();
  const navigate = useNavigate();

  const [staff, setStaff] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    (async () => setStaff(await dataStore.load("managers")))();
  }, []);

  const { page, setPage, totalPages, pageItems: pagedStaff } = usePagination(staff || [], 10);

  if (!staff) return <Loader full label={`Loading ${title.toLowerCase()}...`} />;

  async function runConfirmed() {
    if (!confirmTarget) return;
    const { id, action } = confirmTarget;
    const person = staff.find((s) => s.id === id);
    if (!person) return;

    setConfirmBusy(true);
    try {
      if (action === "reset") {
        // The password is generated and hashed SERVER-side and returned once,
        // for the welcome-email preview only.
        const { credentials } = await apiPost(`/staff/managers/${id}/reset-password`);
        setConfirmBusy(false);
        setConfirmTarget(null);
        navigate(`/app/super-admin/welcome-email/${credentials.userId}`, {
          state: credentials,
        });
        return;
      }

      if (action === "toggle") {
        const updated = await apiPost(`/staff/managers/${id}/toggle`);
        push(
          `${person.name} ${updated.status === "active" ? "enabled" : "disabled"}.`,
          "success",
        );
      } else if (action === "delete") {
        await apiDelete(`/staff/managers/${id}`);
        push(`${person.name} removed.`, "success");
      }

      setStaff(await dataStore.load("managers"));
    } catch (err) {
      push(err?.message || "Could not complete that action.", "error");
    } finally {
      setConfirmBusy(false);
      setConfirmTarget(null);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-400 sm:text-sm">
            Create, enable/disable, or remove manager accounts.
          </p>
        </div>

        <div className="w-full sm:flex sm:justify-end">
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => navigate("/app/super-admin/staff/new?type=managers")}
            className="w-full justify-center sm:w-auto"
          >
            Add Manager
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase text-ink-400">
              <tr>
                <th className="whitespace-nowrap px-3 py-3 sm:px-4">Name</th>
                <th className="whitespace-nowrap px-3 py-3 sm:px-4">Email</th>
                <th className="whitespace-nowrap px-3 py-3 sm:px-4">Status</th>
                <th className="whitespace-nowrap px-3 py-3 text-right sm:px-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {pagedStaff.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-ink-50/50">
                  <td className="max-w-[220px] px-3 py-3 sm:px-4">
                    <div className="truncate font-medium text-ink-800">{s.name}</div>
                  </td>
                  <td className="max-w-[260px] px-3 py-3 text-ink-500 sm:px-4">
                    <div className="truncate">{s.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                    <Badge tone={s.status === "active" ? "active" : "cancelled"}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <div className="flex justify-end gap-1">
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
                        className="hover:bg-brand-50 hover:text-brand-600"
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
                  <td colSpan={4} className="px-4 py-10 text-center text-ink-400">
                    No records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto">
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            className="px-3 pb-3 sm:px-4"
          />
        </div>
      </div>

      {confirmTarget && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-white p-3 shadow-2xl sm:left-72 sm:p-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-center text-sm font-medium leading-5 text-ink-700 sm:text-left">
              {confirmTarget.action === "delete" && "Remove this account? This is permanent."}
              {confirmTarget.action === "toggle" && "Change this account's status?"}
              {confirmTarget.action === "reset" && "Reset this account's password?"}
            </p>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
              <Button
                variant="secondary"
                onClick={() => setConfirmTarget(null)}
                disabled={confirmBusy}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant={confirmTarget.action === "delete" ? "danger" : "primary"}
                onClick={runConfirmed}
                loading={confirmBusy}
                className="w-full sm:w-auto"
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