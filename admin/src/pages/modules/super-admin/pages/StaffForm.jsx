// admin/src/pages/modules/super-admin/pages/StaffForm.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import { apiPost } from "../../../../components/services/api";
import { deriveEmail } from "../../../../components/utils/credentials";
import Button from "../../../../components/shared/Button";
import { useToast } from "../../../../components/hooks/useToast";

export default function StaffForm() {
  const navigate = useNavigate();
  const { push } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "Restaurant Operations",
    designation: "Restaurant Manager",
    status: "active",
  });
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) return push("Please enter the manager's name.", "error");
    if (!form.email.trim()) return push("Please enter an email address.", "error");

    setSaving(true);
    try {
      // IDs, the password hash and the duplicate-email check all happen
      // server-side in one transaction. The browser never generates or holds
      // a password hash, and there is no half-created manager on failure.
      const { credentials } = await apiPost("/staff/managers", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        department: form.department.trim(),
        designation: form.designation.trim(),
        status: form.status,
      });

      push("Manager account created successfully.", "success");
      navigate(`/app/super-admin/welcome-email/${credentials.userId}`, {
        state: credentials,
      });
    } catch (err) {
      push(err?.message || "Failed to create manager. Please try again.", "error");
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
        <ArrowLeft size={16} /> Back to Managers
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
                A temporary password is generated on the server and shown once.
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
                if (!form.email.trim() && form.name.trim()) {
                  updateField("email", deriveEmail(form.name));
                }
              }}
              placeholder="manager@conveyorgroup.com"
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
              placeholder="Restaurant Operations"
            />

            <Field
              label="Designation"
              value={form.designation}
              onChange={(v) => updateField("designation", v)}
              placeholder="Restaurant Manager"
            />

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="box-border w-full min-w-0 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-base outline-none transition-colors focus:border-brand-500 sm:text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
              {saving ? "Creating..." : "Create Manager"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required = false, type = "text", value, onChange, onBlur, placeholder }) {
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
        className="box-border w-full min-w-0 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-base outline-none transition-colors focus:border-brand-500 sm:text-sm"
      />
    </div>
  );
}