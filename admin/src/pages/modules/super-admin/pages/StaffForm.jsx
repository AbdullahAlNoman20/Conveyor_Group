// admin/src/pages/modules/super-admin/pages/StaffForm.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import { apiPost } from "../../../../components/services/api";
import { deriveEmail } from "../../../../components/utils/credentials";
import Button from "../../../../components/shared/Button";
import { useToast } from "../../../../components/hooks/useToast";

/**
 * Each kind of staff member sits in a different part of the business, so the
 * department and job title are prefilled to match the role. They stay editable,
 * and once edited they are left alone even if the role changes again.
 */
const ROLE_DEFAULTS = {
  manager: {
    label: "Manager",
    blurb: "Runs the counter and serves meals",
    department: "Restaurant Operations",
    designation: "Restaurant Manager",
  },
  accounts: {
    label: "Accounts",
    blurb: "Buys food, keeps the store room and the cost reports",
    department: "Accounts",
    designation: "Accounts Officer",
  },
};

export default function StaffForm() {
  const navigate = useNavigate();
  const { push } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "manager",
    department: ROLE_DEFAULTS.manager.department,
    designation: ROLE_DEFAULTS.manager.designation,
    status: "active",
  });

  // Once either field is typed into by hand, switching the role must not
  // quietly overwrite what was entered.
  const [touched, setTouched] = useState({ department: false, designation: false });
  const [saving, setSaving] = useState(false);

  const roleInfo = ROLE_DEFAULTS[form.role];

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "department" || field === "designation") {
      setTouched((t) => ({ ...t, [field]: true }));
    }
  }

  function changeRole(role) {
    const defaults = ROLE_DEFAULTS[role];
    setForm((prev) => ({
      ...prev,
      role,
      department: touched.department ? prev.department : defaults.department,
      designation: touched.designation ? prev.designation : defaults.designation,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) return push("Please put the full name.", "error");
    if (!form.email.trim()) return push("Please put an email address.", "error");

    setSaving(true);
    try {
      // The id, the password and the duplicate email check all happen on the
      // server in one go, so the browser never holds a password and a failure
      // cannot leave a half made account behind.
      const { credentials } = await apiPost("/staff/managers", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        department: form.department.trim(),
        designation: form.designation.trim(),
        status: form.status,
        role: form.role,
      });

      push(`${roleInfo.label} account created.`, "success");
      navigate(`/app/super-admin/welcome-email/${credentials.userId}`, {
        state: credentials,
      });
    } catch (err) {
      push(err?.message || "Could not create the account. Please try again.", "error");
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
        <ArrowLeft size={16} /> Back to Staff Accounts
      </button>

      <div className="rounded-2xl border border-ink-100 bg-white">
        <div className="border-b border-ink-100 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <UserPlus size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-ink-900 sm:text-xl">
                Add Staff
              </h1>
              <p className="text-xs leading-5 text-ink-500 sm:text-sm">
                A password is made by the system and shown to you once.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
          {/* Role comes first because it sets the two fields below it. */}
          <div>
            <label htmlFor="role" className="mb-1.5 block text-xs font-semibold text-ink-700">
              Staff Type <span className="ml-0.5 text-brand-600">*</span>
            </label>

            <select
              id="role"
              value={form.role}
              onChange={(e) => changeRole(e.target.value)}
              className="box-border w-full min-w-0 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-base outline-none transition-colors focus:border-brand-500 sm:text-sm"
            >
              {Object.entries(ROLE_DEFAULTS).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>

            <p className="mt-1.5 text-[11px] leading-4 text-ink-500">
              {roleInfo.blurb}. You can change what they are allowed to do later
              in Access Control.
            </p>
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field
              label="Full Name"
              required
              value={form.name}
              onChange={(v) => updateField("name", v)}
              placeholder="e.g. Arif Hasan"
            />

            <Field
              label="Email"
              required
              type="email"
              value={form.email}
              onChange={(v) => updateField("email", v)}
              onBlur={() => {
                // Saves typing when the email follows the usual pattern.
                if (!form.email.trim() && form.name.trim()) {
                  updateField("email", deriveEmail(form.name));
                }
              }}
              placeholder="name@conveyorgroup.com"
            />

            <Field
              label="Phone"
              value={form.phone}
              onChange={(v) => updateField("phone", v)}
              placeholder="01XXXXXXXXX"
            />

            <Field
              label="Department"
              value={form.department}
              onChange={(v) => updateField("department", v)}
              placeholder={roleInfo.department}
            />

            <Field
              label="Job Title"
              value={form.designation}
              onChange={(v) => updateField("designation", v)}
              placeholder={roleInfo.designation}
            />

            <div>
              <label htmlFor="status" className="mb-1.5 block text-xs font-semibold text-ink-700">
                Status
              </label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="box-border w-full min-w-0 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-base outline-none transition-colors focus:border-brand-500 sm:text-sm"
              >
                <option value="active">On, can log in</option>
                <option value="inactive">Off, cannot log in</option>
              </select>
            </div>
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
              loading={saving}
              className="w-full justify-center sm:w-auto"
            >
              {saving ? "Creating..." : `Create ${roleInfo.label}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required = false, type = "text", value, onChange, onBlur, placeholder }) {
  const id = `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-ink-700">
        {label}
        {required && <span className="ml-0.5 text-brand-600">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="box-border w-full min-w-0 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-base outline-none transition-colors focus:border-brand-500 sm:text-sm"
      />
    </div>
  );
}