import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  Ban,
  CheckCircle2,
  Trash2,
  KeyRound,
  IdCard,
} from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import {
  generatePassword,
  deriveEmail,
} from "../../../../components/utils/credentials";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Pagination, {
  usePagination,
} from "../../../../components/shared/Pagination";

// storageKey drives which query param StaffForm/StaffProfileView expect
// ("managers" or "kitchen-staff") — see SuperAdminRoutes.jsx wiring.
export default function StaffManagement({
  title,
  storageKey,
  seedFile,
  idPrefix,
  showEmail = true,
  roleField,
  loginRole,
  routeType,
}) {
  const { push } = useToast();
  const navigate = useNavigate();

  const [staff, setStaff] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    (async () =>
      setStaff(await dataStore.load(storageKey, seedFile)))();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedStaff,
  } = usePagination(staff || [], 10);

  if (!staff)
    return (
      <Loader
        full
        label={`Loading ${title.toLowerCase()}...`}
      />
    );

  async function runConfirmed() {
    if (!confirmTarget) return;

    setConfirmBusy(true);

    const { id, action } = confirmTarget;
    const person = staff.find((s) => s.id === id);

    if (action === "toggle") {
      const nextStatus =
        person.status === "active"
          ? "disabled"
          : "active";

      const next = await dataStore.update(
        storageKey,
        (s) => s.id === id,
        { status: nextStatus }
      );

      setStaff(next);

      if (person?.userId) {
        await dataStore.update(
          "users",
          (u) => u.id === person.userId,
          {
            status:
              nextStatus === "disabled"
                ? "suspended"
                : "active",
          }
        );
      }

      push(
        `${person.name} ${
          nextStatus === "disabled"
            ? "disabled"
            : "enabled"
        }.`,
        "success"
      );
    } else if (action === "delete") {
      const next = await dataStore.remove(
        storageKey,
        (s) => s.id === id
      );

      setStaff(next);

      if (person?.userId) {
        await dataStore.remove(
          "users",
          (u) => u.id === person.userId
        );
      }

      push(`${person.name} removed.`, "success");
    } else if (action === "reset") {
      const newPassword = generatePassword();

      if (person.userId) {
        await dataStore.update(
          "users",
          (u) => u.id === person.userId,
          {
            password: newPassword,
          }
        );
      }

      setConfirmBusy(false);
      setConfirmTarget(null);

      navigate(
        `/app/super-admin/welcome-email/${person.userId}`,
        {
          state: {
            name: person.name,
            email:
              person.email ||
              deriveEmail(person.name),
            password: newPassword,
            role:
              person.role ||
              title.replace(" Management", ""),
          },
        }
      );

      return;
    }

    setConfirmBusy(false);
    setConfirmTarget(null);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* =========================================================
          HEADER
      ========================================================== */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
            {title}
          </h1>

          <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-400 sm:text-sm">
            Create, enable/disable, or remove{" "}
            {title.toLowerCase()} accounts.
          </p>
        </div>

        {/* Add Button */}
        <div className="w-full sm:flex sm:justify-end">
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() =>
              navigate(
                `/app/super-admin/staff/new?type=${routeType}`
              )
            }
            className="w-full justify-center sm:w-auto"
          >
            Add
          </Button>
        </div>
      </div>

      {/* =========================================================
          TABLE
      ========================================================== */}
      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        {/* 
          Mobile:
          Table keeps a minimum width and becomes horizontally
          scrollable instead of breaking the page layout.
        */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase text-ink-400">
              <tr>
                <th className="whitespace-nowrap px-3 py-3 sm:px-4">
                  Name
                </th>

                {showEmail && (
                  <th className="whitespace-nowrap px-3 py-3 sm:px-4">
                    Email
                  </th>
                )}

                {roleField && (
                  <th className="whitespace-nowrap px-3 py-3 sm:px-4">
                    Role
                  </th>
                )}

                <th className="whitespace-nowrap px-3 py-3 sm:px-4">
                  Status
                </th>

                <th className="whitespace-nowrap px-3 py-3 text-right sm:px-4">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {pagedStaff.map((s) => (
                <tr
                  key={s.id}
                  className="transition-colors hover:bg-ink-50/50"
                >
                  {/* Name */}
                  <td className="max-w-[220px] px-3 py-3 sm:px-4">
                    <div className="truncate font-medium text-ink-800">
                      {s.name}
                    </div>
                  </td>

                  {/* Email */}
                  {showEmail && (
                    <td className="max-w-[260px] px-3 py-3 text-ink-500 sm:px-4">
                      <div className="truncate">
                        {s.email}
                      </div>
                    </td>
                  )}

                  {/* Role */}
                  {roleField && (
                    <td className="max-w-[180px] px-3 py-3 text-ink-500 sm:px-4">
                      <div className="truncate">
                        {s.role}
                      </div>
                    </td>
                  )}

                  {/* Status */}
                  <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                    <Badge
                      tone={
                        s.status === "active"
                          ? "active"
                          : "cancelled"
                      }
                    >
                      {s.status}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3 sm:px-4">
                    <div className="flex justify-end gap-1">
                      {/* View Profile */}
                      <Button
                        variant="icon"
                        title="View Profile"
                        onClick={() =>
                          navigate(
                            `/app/super-admin/staff/${s.id}?type=${routeType}`
                          )
                        }
                      >
                        <IdCard size={14} />
                      </Button>

                      {/* Reset Password */}
                      <Button
                        variant="icon"
                        title="Reset Password"
                        onClick={() =>
                          setConfirmTarget({
                            id: s.id,
                            action: "reset",
                          })
                        }
                      >
                        <KeyRound size={14} />
                      </Button>

                      {/* Enable / Disable */}
                      <Button
                        variant="icon"
                        title={
                          s.status === "active"
                            ? "Disable"
                            : "Enable"
                        }
                        onClick={() =>
                          setConfirmTarget({
                            id: s.id,
                            action: "toggle",
                          })
                        }
                      >
                        {s.status === "active" ? (
                          <Ban size={14} />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="icon"
                        title="Delete"
                        className="hover:bg-brand-50 hover:text-brand-600"
                        onClick={() =>
                          setConfirmTarget({
                            id: s.id,
                            action: "delete",
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Empty State */}
              {staff.length === 0 && (
                <tr>
                  <td
                    colSpan={
                      2 +
                      (showEmail ? 1 : 0) +
                      (roleField ? 1 : 0)
                    }
                    className="px-4 py-10 text-center text-ink-400"
                  >
                    No records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* =======================================================
            PAGINATION
        ======================================================== */}
        <div className="overflow-x-auto">
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            className="px-3 pb-3 sm:px-4"
          />
        </div>
      </div>

      {/* =========================================================
          CONFIRM BAR
      ========================================================== */}
      {confirmTarget && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-white p-3 shadow-2xl sm:left-72 sm:p-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Confirmation Message */}
            <p className="text-center text-sm font-medium leading-5 text-ink-700 sm:text-left">
              {confirmTarget.action ===
                "delete" &&
                "Remove this account? This is permanent."}

              {confirmTarget.action ===
                "toggle" &&
                "Change this account's status?"}

              {confirmTarget.action ===
                "reset" &&
                "Reset this account's password?"}
            </p>

            {/* Confirmation Buttons */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
              <Button
                variant="secondary"
                onClick={() =>
                  setConfirmTarget(null)
                }
                disabled={confirmBusy}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>

              <Button
                variant={
                  confirmTarget.action === "delete"
                    ? "danger"
                    : "primary"
                }
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