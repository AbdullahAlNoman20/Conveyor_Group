// FILE: src/pages/modules/super-admin/pages/SuperAdminClients.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  Edit2,
  Ban,
  Trash2,
  KeyRound,
  IdCard,
  RotateCcw,
  Archive,
} from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import {
  sanitizeText,
  sanitizeEmail,
} from "../../../../components/utils/sanitize";
import {
  generatePassword,
  deriveEmail,
} from "../../../../components/utils/credentials";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";
import FormField from "../../../../components/shared/FormField";
import Badge from "../../../../components/shared/Badge";
import SearchInput from "../../../../components/shared/SearchInput";
import Pagination, {
  usePagination,
} from "../../../../components/shared/Pagination";
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
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    (async () =>
      setClients(await dataStore.load("clients", "clients.json")))();
  }, []);

  const filtered = (clients || []).filter(
    (c) =>
      (showArchived
        ? c.status === "archived"
        : c.status !== "archived") &&
      (c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.employeeId.toLowerCase().includes(query.toLowerCase()))
  );

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedClients,
  } = usePagination(filtered, 10);

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
      const next = await dataStore.update(
        "clients",
        (c) => c.id === editing.id,
        {
          ...form,
          name: cleanName,
        }
      );

      setClients(next);

      await dataStore.update(
        "users",
        (u) => u.id === editing.userId,
        {
          name: cleanName,
          email: form.email ? sanitizeEmail(form.email) : undefined,
          phone: sanitizeText(form.phone, 20),
        }
      );

      setSaving(false);

      push(`${cleanName} updated.`, "success");

      setEditOpen(false);
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
      const next = await dataStore.update(
        "clients",
        (c) => c.id === id,
        {
          status: "archived",
          prevStatus: client.status,
        }
      );

      setClients(next);

      if (client?.userId) {
        await dataStore.update(
          "users",
          (u) => u.id === client.userId,
          {
            status: "suspended",
          }
        );
      }

      push(
        "Client moved to Recycle Bin — restore anytime.",
        "success"
      );
    } else if (action === "restore") {
      const next = await dataStore.update(
        "clients",
        (c) => c.id === id,
        {
          status: client.prevStatus || "active",
        }
      );

      setClients(next);

      if (client?.userId) {
        await dataStore.update(
          "users",
          (u) => u.id === client.userId,
          {
            status: "active",
          }
        );
      }

      push("Client restored.", "success");
    } else if (action === "suspend") {
      const next = await dataStore.update(
        "clients",
        (c) => c.id === id,
        {
          status: "suspended",
        }
      );

      setClients(next);

      if (client?.userId) {
        await dataStore.update(
          "users",
          (u) => u.id === client.userId,
          {
            status: "suspended",
          }
        );
      }

      push("Client suspended.", "success");
    } else if (action === "activate") {
      const next = await dataStore.update(
        "clients",
        (c) => c.id === id,
        {
          status: "active",
        }
      );

      setClients(next);

      if (client?.userId) {
        await dataStore.update(
          "users",
          (u) => u.id === client.userId,
          {
            status: "active",
          }
        );
      }

      push("Client reactivated.", "success");
    } else if (action === "reset") {
      const newPassword = generatePassword();

      if (client?.userId) {
        await dataStore.update(
          "users",
          (u) => u.id === client.userId,
          {
            password: newPassword,
          }
        );
      }

      setConfirmBusy(false);
      setConfirmTarget(null);

      navigate(
        `/app/super-admin/welcome-email/${client.userId}`,
        {
          state: {
            name: client.name,
            email:
              client.email || deriveEmail(client.name),
            password: newPassword,
            role: `Client (${client.mealPlan})`,
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
          PAGE HEADER
      ========================================================== */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
            Client Management
          </h1>

          <p className="mt-1 max-w-3xl text-xs leading-5 text-ink-400 sm:text-sm">
            Create a client and their login account, virtual ID card,
            and QR are generated together.
          </p>
        </div>

        {/* =====================================================
            SEARCH + ACTIONS
        ====================================================== */}
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {/* Search */}
          <div className="w-full sm:min-w-[240px] sm:flex-1 lg:max-w-sm">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search name or Employee ID..."
            />
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button
              variant="secondary"
              icon={Archive}
              onClick={() =>
                setShowArchived((s) => !s)
              }
              className="w-full justify-center sm:w-auto"
            >
              {showArchived
                ? "Show Active"
                : "Recycle Bin"}
            </Button>

            <Button
              variant="primary"
              icon={UserPlus}
              onClick={() =>
                navigate(
                  "/app/super-admin/clients/new"
                )
              }
              className="w-full justify-center sm:w-auto"
            >
              <span className="sm:inline">
                Create Client
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================
          CLIENT TABLE
      ========================================================== */}
      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        {/* Horizontal scrolling wrapper for mobile */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase text-ink-400">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">
                  Name
                </th>

                <th className="whitespace-nowrap px-4 py-3">
                  Employee ID
                </th>

                <th className="whitespace-nowrap px-4 py-3">
                  Department
                </th>

                <th className="whitespace-nowrap px-4 py-3">
                  Meal Plan
                </th>

                <th className="whitespace-nowrap px-4 py-3">
                  Status
                </th>

                <th className="whitespace-nowrap px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {pagedClients.map((c) => (
                <tr
                  key={c.id}
                  className="transition-colors hover:bg-ink-50/50"
                >
                  <td className="max-w-[220px] px-4 py-3 font-medium text-ink-800">
                    <div className="truncate">
                      {c.name}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-ink-500">
                    {c.employeeId}
                  </td>

                  <td className="max-w-[180px] px-4 py-3 text-ink-500">
                    <div className="truncate">
                      {c.department}
                    </div>
                  </td>

                  <td className="max-w-[200px] px-4 py-3 text-ink-500">
                    <div className="truncate">
                      {c.mealPlan}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge tone={c.status}>
                      {c.status}
                    </Badge>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {/* View Profile */}
                      <Button
                        variant="icon"
                        title="View Profile"
                        onClick={() =>
                          navigate(
                            `/app/super-admin/clients/${c.id}`
                          )
                        }
                      >
                        <IdCard size={14} />
                      </Button>

                      {c.status === "archived" ? (
                        /* Restore */
                        <Button
                          variant="icon"
                          title="Restore"
                          onClick={() =>
                            setConfirmTarget({
                              id: c.id,
                              action: "restore",
                            })
                          }
                        >
                          <RotateCcw size={14} />
                        </Button>
                      ) : (
                        <>
                          {/* Edit */}
                          <Button
                            variant="icon"
                            title="Edit"
                            onClick={() =>
                              openEdit(c)
                            }
                          >
                            <Edit2 size={14} />
                          </Button>

                          {/* Reset Password */}
                          <Button
                            variant="icon"
                            title="Reset Password"
                            onClick={() =>
                              setConfirmTarget({
                                id: c.id,
                                action: "reset",
                              })
                            }
                          >
                            <KeyRound size={14} />
                          </Button>

                          {/* Suspend / Reactivate */}
                          {c.status === "active" ? (
                            <Button
                              variant="icon"
                              title="Suspend"
                              onClick={() =>
                                setConfirmTarget({
                                  id: c.id,
                                  action: "suspend",
                                })
                              }
                            >
                              <Ban size={14} />
                            </Button>
                          ) : (
                            <Button
                              variant="icon"
                              title="Reactivate"
                              onClick={() =>
                                setConfirmTarget({
                                  id: c.id,
                                  action: "activate",
                                })
                              }
                            >
                              <RotateCcw size={14} />
                            </Button>
                          )}

                          {/* Delete */}
                          <Button
                            variant="icon"
                            title="Delete (moves to Recycle Bin)"
                            className="hover:bg-brand-50 hover:text-brand-600"
                            onClick={() =>
                              setConfirmTarget({
                                id: c.id,
                                action: "delete",
                              })
                            }
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
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-ink-400"
                  >
                    No clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
          EDIT CLIENT
      ========================================================== */}
      {editOpen && (
        <div className="rounded-xl border border-ink-100 bg-white p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-ink-900">
              Edit Client
            </h2>

            <p className="mt-1 text-xs text-ink-400 sm:text-sm">
              Update the client's profile and meal settings.
            </p>
          </div>

          <form
            onSubmit={saveForm}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {/* Name */}
            <FormField label="Name" required>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>

            {/* Employee ID */}
            <FormField
              label="Employee ID"
              required
            >
              <input
                value={form.employeeId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    employeeId: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>

            {/* Email */}
            <FormField
              label="Email"
              hint="Leave blank to auto-generate from the name"
            >
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    email: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>

            {/* Phone */}
            <FormField label="Phone">
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    phone: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>

            {/* Department */}
            <FormField label="Department">
              <input
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    department: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>

            {/* Designation */}
            <FormField label="Designation">
              <input
                value={form.designation}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    designation: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>

            {/* Employment Type */}
            <FormField label="Employment Type">
              <select
                value={form.employmentType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    employmentType:
                      e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option>
                  Company Employee
                </option>
                <option>
                  External Client
                </option>
                <option>Contractor</option>
                <option>
                  Temporary Employee
                </option>
              </select>
            </FormField>

            {/* Meal Plan */}
            <FormField
              label="Meal Plan"
              hint="Controls whether they see the fixed daily meal or the full menu at order time"
            >
              <select
                value={form.mealPlan}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    mealPlan: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option>
                  Fixed Company Meal
                </option>
                <option>Custom Menu</option>
                <option>
                  Complimentary Meal
                </option>
              </select>
            </FormField>

            {/* Meal Benefit */}
            <div className="sm:col-span-2">
              <FormField label="Meal Benefit">
                <select
                  value={form.mealBenefit}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      mealBenefit: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option>
                    Company Subsidized
                  </option>
                  <option>Complimentary</option>
                  <option>Self Paid</option>
                </select>
              </FormField>
            </div>

            {/* Form Actions */}
            <div className="grid grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() =>
                  setEditOpen(false)
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={saving}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================
          INLINE CONFIRM BAR
      ========================================================== */}
      {confirmTarget && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-white p-3 shadow-2xl sm:left-72 sm:p-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Message */}
            <p className="text-center text-sm font-medium leading-5 text-ink-700 sm:text-left">
              {confirmTarget.action ===
                "delete" &&
                "Move this client to the Recycle Bin?"}

              {confirmTarget.action ===
                "restore" &&
                "Restore this client from the Recycle Bin?"}

              {confirmTarget.action ===
                "suspend" &&
                "Suspend this client?"}

              {confirmTarget.action ===
                "activate" &&
                "Reactivate this client?"}

              {confirmTarget.action ===
                "reset" &&
                "Reset this client's password?"}
            </p>

            {/* Confirm Buttons */}
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
                  confirmTarget.action ===
                  "delete"
                    ? "danger"
                    : "primary"
                }
                onClick={handleConfirm}
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