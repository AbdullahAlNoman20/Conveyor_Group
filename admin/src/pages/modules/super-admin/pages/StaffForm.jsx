import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  UserPlus,
} from "lucide-react";

import { dataStore } from "../../../../components/services/dataStore";
import {
  deriveEmail,
  generatePassword,
} from "../../../../components/utils/credentials";
import Button from "../../../../components/shared/Button";
import Loader from "../../../../components/shared/Loader";
import { useToast } from "../../../../components/hooks/useToast";

export default function StaffForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [managers, setManagers] = useState(null);
  const [users, setUsers] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "Restaurant Operations",
    designation: "Restaurant Manager",
    status: "active",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const type = params.get("type");

  useEffect(() => {
    if (type !== "managers") return;

    let mounted = true;

    (async () => {
      const [managerData, userData] = await Promise.all([
        dataStore.load("managers", "managers.json"),
        dataStore.load("users", "users.json"),
      ]);

      if (!mounted) return;

      setManagers(managerData || []);
      setUsers(userData || []);

      setForm((prev) => ({
        ...prev,
        password: generatePassword(),
      }));
    })();

    return () => {
      mounted = false;
    };
  }, [type]);

  if (type !== "managers") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate("/app/super-admin/managers")}
          className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600"
        >
          <ArrowLeft size={16} />
          Back to Managers
        </button>

        <div className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
          Staff creation is currently available for Managers only.
        </div>
      </div>
    );
  }

  if (!managers || !users) {
    return <Loader full label="Loading form..." />;
  }

  const nextManagerId = getNextId(managers, "MG-");
  const nextUserId = getNextId(users, "U-");

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleGeneratePassword() {
    updateField("password", generatePassword());
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const department = form.department.trim();
    const designation = form.designation.trim();
    const password = form.password.trim();

    if (!name) {
      toast.error?.("Please enter the manager's name.");
      return;
    }

    if (!email) {
      toast.error?.("Please enter an email address.");
      return;
    }

    if (!password) {
      toast.error?.("Please generate or enter a password.");
      return;
    }

    const duplicateEmail = users.some(
      (user) => user.email?.toLowerCase() === email,
    );

    if (duplicateEmail) {
      toast.error?.("This email address is already in use.");
      return;
    }

    setSaving(true);

    try {
      const managerRecord = {
        id: nextManagerId,
        name,
        email,
        status: form.status,
      };

      const userRecord = {
        id: nextUserId,
        name,
        email,
        role: "manager",
        status: form.status,
        department,
        designation,
        ...(phone ? { phone } : {}),
      };

      await dataStore.insert("managers", managerRecord);
      await dataStore.insert("users", userRecord);

      toast.success?.("Manager account created successfully.");

      navigate(`/app/super-admin/welcome-email/${nextUserId}`, {
        state: {
          name,
          email,
          password,
          role: "Manager",
        },
      });
    } catch (error) {
      console.error("Failed to create manager:", error);
      toast.error?.("Failed to create manager. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="box-border w-full min-w-0 max-w-full space-y-5 overflow-x-hidden">
      <button
        type="button"
        onClick={() => navigate("/app/super-admin/managers")}
        className="flex items-center gap-1 text-sm font-semibold text-ink-500 transition hover:text-brand-600"
      >
        <ArrowLeft size={16} />
        Back to Managers
      </button>

      <div className="rounded-2xl border border-ink-100 bg-white">
        <div className="border-b border-ink-100 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <UserPlus size={20} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-ink-900 sm:text-xl">
                Create Manager
              </h1>
              <p className="text-xs text-ink-400 sm:text-sm">
                Create a new manager login account.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field
              label="Full Name"
              required
              value={form.name}
              onChange={(value) => updateField("name", value)}
              placeholder="e.g. Arif Hasan"
            />

            <Field
              label="Email"
              required
              type="email"
              value={form.email}
              onChange={(value) => updateField("email", value)}
              onBlur={() => {
                if (!form.email.trim() && form.name.trim()) {
                  updateField("email", deriveEmail(form.name));
                }
              }}
              placeholder="manager@example.com"
            />

            <Field
              label="Phone"
              value={form.phone}
              onChange={(value) => updateField("phone", value)}
              placeholder="01XXXXXXXXX"
            />

            <Field
              label="Department"
              value={form.department}
              onChange={(value) => updateField("department", value)}
              placeholder="Restaurant Operations"
            />

            <Field
              label="Designation"
              value={form.designation}
              onChange={(value) => updateField("designation", value)}
              placeholder="Restaurant Manager"
            />

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-700">
                Status
              </label>

              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="box-border w-full min-w-0 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-base outline-none transition-colors focus:border-brand-500 focus:outline-none focus:ring-0 sm:text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-ink-700">
                Login Password
              </label>

              <div className="flex min-w-0 gap-2">
                <div className="relative min-w-0 flex-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      updateField("password", e.target.value)
                    }
                    className="box-border w-full min-w-0 rounded-lg border border-ink-200 bg-white px-3 py-2.5 pr-10 text-base outline-none transition-colors focus:border-brand-500 focus:outline-none focus:ring-0 sm:text-sm"
                    placeholder="Generated password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-400 hover:text-ink-700"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold text-ink-700 transition hover:bg-ink-50"
                >
                  <RefreshCw size={15} />
                  <span className="hidden sm:inline">Generate</span>
                </button>
              </div>

              <p className="mt-1.5 text-[11px] leading-4 text-ink-400">
                This password will be used for the manager's initial login.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-ink-50 p-3 text-xs leading-5 text-ink-500">
            <span className="font-semibold text-ink-700">Manager ID:</span>{" "}
            {nextManagerId}
            <span className="mx-2 text-ink-300">•</span>
            <span className="font-semibold text-ink-700">User ID:</span>{" "}
            {nextUserId}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/app/super-admin/managers")}
              className="w-full justify-center sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              icon={Save}
              disabled={saving}
              className="w-full justify-center sm:w-auto"
            >
              {saving ? "Creating..." : "Create Manager"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required = false,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-ink-700">
        {label}
        {required && <span className="ml-0.5 text-brand-600">*</span>}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="box-border w-full min-w-0 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-base outline-none transition-colors focus:border-brand-500 focus:outline-none focus:ring-0 sm:text-sm"
      />
    </div>
  );
}

function getNextId(list, prefix) {
  const numbers = list
    .map((item) => {
      const match = String(item?.id || "").match(
        new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`),
      );

      return match ? Number(match[1]) : 0;
    })
    .filter((number) => Number.isFinite(number));

  const next = Math.max(0, ...numbers) + 1;

  return `${prefix}${String(next).padStart(2, "0")}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}