// admin/src/components/shared/PasswordChangeSection.jsx
import { useState } from "react";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { apiPost } from "../services/api";
import { useToast } from "../hooks/useToast";
import FormField from "./FormField";

// Now fully wired. The current password is verified SERVER-side only —
// the old TODO in this file is closed.
export default function PasswordChangeSection() {
  const { push } = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({ current: false, next: false });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.current) next.current = "Current password is required.";
    if (form.next.length < 10) next.next = "At least 10 characters.";
    else if (!/[a-z]/.test(form.next) || !/[A-Z]/.test(form.next) || !/[0-9]/.test(form.next)) {
      next.next = "Use upper case, lower case and a digit.";
    }
    if (form.confirm !== form.next) next.confirm = "Passwords don't match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await apiPost("/auth/password", { currentPassword: form.current, newPassword: form.next });
      setForm({ current: "", next: "", confirm: "" });
      push("Password updated — please sign in again.", "success");
      // Every session is revoked server-side, so send them back to login.
      setTimeout(() => { window.location.href = "/login"; }, 1200);
    } catch (err) {
      push(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-ink-200 px-3 py-2.5 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-ink-100 bg-white p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <KeyRound size={16} className="text-ink-500" />
        <h2 className="text-sm font-bold text-ink-900">Change Password</h2>
      </div>

      <FormField label="Current Password" error={errors.current} required>
        <div className="relative">
          <input
            type={show.current ? "text" : "password"}
            autoComplete="current-password"
            maxLength={128}
            value={form.current}
            onChange={(e) => set("current", e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShow((s) => ({ ...s, current: !s.current }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
            aria-label={show.current ? "Hide password" : "Show password"}
          >
            {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </FormField>

      <FormField
        label="New Password"
        error={errors.next}
        hint="At least 10 characters, with upper case, lower case and a digit."
        required
      >
        <div className="relative">
          <input
            type={show.next ? "text" : "password"}
            autoComplete="new-password"
            maxLength={128}
            value={form.next}
            onChange={(e) => set("next", e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShow((s) => ({ ...s, next: !s.next }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
            aria-label={show.next ? "Hide password" : "Show password"}
          >
            {show.next ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </FormField>

      <FormField label="Confirm New Password" error={errors.confirm} required>
        <input
          type="password"
          autoComplete="new-password"
          maxLength={128}
          value={form.confirm}
          onChange={(e) => set("confirm", e.target.value)}
          className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          placeholder="••••••••"
        />
      </FormField>

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <KeyRound size={16} /> {saving ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}