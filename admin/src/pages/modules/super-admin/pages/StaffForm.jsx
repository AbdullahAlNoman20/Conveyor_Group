import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText, sanitizeEmail } from "../../../../components/utils/sanitize";
import { generatePassword, deriveEmail } from "../../../../components/utils/credentials";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";
import FormField from "../../../../components/shared/FormField";

// type=managers | kitchen-staff, driven by query param so one page covers
// both "Add Manager" and "Add Kitchen Staff".
const CONFIG = {
  managers: { title: "Add Manager", storageKey: "managers", idPrefix: "MG", showEmail: true, roleField: false, loginRole: "manager" },
  "kitchen-staff": { title: "Add Kitchen Staff", storageKey: "kitchenStaff", idPrefix: "KS", showEmail: false, roleField: true, loginRole: "kitchen_head" },
};

export default function StaffForm() {
  const [params] = useSearchParams();
  const type = params.get("type") === "kitchen-staff" ? "kitchen-staff" : "managers";
  const cfg = CONFIG[type];
  const navigate = useNavigate();
  const { push } = useToast();
  const [form, setForm] = useState({ name: "", email: "", role: "Kitchen Head" });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      push("Name is required.", "error");
      return;
    }
    setSaving(true);
    const cleanName = sanitizeText(form.name, 100);
    const email = form.email ? sanitizeEmail(form.email) : deriveEmail(cleanName);
    const password = generatePassword();
    const staffId = genId(cfg.idPrefix);
    const userId = genId("U");

    const record = {
      id: staffId,
      userId,
      name: cleanName,
      email,
      ...(cfg.roleField ? { role: form.role } : {}),
      status: "active",
    };
    const userRecord = {
      id: userId,
      name: cleanName,
      email,
      password,
      role: cfg.loginRole,
      status: "active",
      designation: cfg.roleField ? form.role : cfg.title.replace("Add ", ""),
      avatarColor: cfg.loginRole === "manager" ? "#eb2a2d" : "#d97706",
    };

    await dataStore.insert(cfg.storageKey, record);
    await dataStore.insert("users", userRecord);
    setSaving(false);
    push(`${cleanName} added — login account ready.`, "success");
    navigate(`/app/super-admin/welcome-email/${userId}`, {
      state: { name: cleanName, email, password, role: cfg.roleField ? form.role : cfg.title.replace("Add ", "") },
    });
  }

  const backTo = type === "kitchen-staff" ? "/app/super-admin/kitchen-staff" : "/app/super-admin/managers";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <button onClick={() => navigate(backTo)} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-2xl font-bold text-ink-900">{cfg.title}</h1>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-ink-100 bg-white p-6">
        <FormField label="Name" required>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </FormField>
        {cfg.showEmail && (
          <FormField label="Email" hint="Leave blank to auto-generate">
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
          </FormField>
        )}
        {cfg.roleField && (
          <FormField label="Role">
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100">
              <option>Kitchen Head</option>
              <option>Cook</option>
              <option>Helper</option>
            </select>
          </FormField>
        )}
        <Button type="submit" variant="primary" fullWidth loading={saving} icon={UserPlus}>
          Save & Continue
        </Button>
      </form>
    </div>
  );
}