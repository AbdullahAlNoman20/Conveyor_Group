// FILE: src/pages/modules/super-admin/pages/RestaurantSettings.jsx  (MODIFIED, full rewrite)
import { useState } from "react";
import { Save, Info } from "lucide-react";
import { readSettings, writeSettings } from "../../../../components/services/settings";
import { sanitizeText, sanitizeNumber } from "../../../../components/utils/sanitize";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";
import FormField from "../../../../components/shared/FormField";

export default function RestaurantSettings() {
  const { push } = useToast();
  const [settings, setSettings] = useState(readSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(field, value) {
    setSettings((s) => ({ ...s, [field]: value }));
  }

  function save(e) {
    e.preventDefault();
    setSaving(true);
    // writeSettings is synchronous (localStorage), but we still show a
    // brief transaction animation so a system-wide change (tax rate etc.)
    // FEELS as consequential as it actually is.
    setTimeout(() => {
      writeSettings(settings);
      setSaving(false);
      setSaved(true);
      push("Restaurant settings saved — now applied system-wide.", "success");
      setTimeout(() => setSaved(false), 1200);
    }, 300);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Restaurant Settings</h1>
        <p className="text-sm text-ink-400">Invoice, email, and notification configuration.</p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
        <Info size={18} className="mt-0.5 shrink-0" />
        <p>
          Tax Rate here is live: it's what New Order, self-service ordering, and every invoice
          calculation use — change it once and it applies everywhere immediately, no reload
          needed.
        </p>
      </div>

      <form onSubmit={save} className="space-y-4 rounded-xl border border-ink-100 bg-white p-6">
        <FormField label="Restaurant Name" required>
          <input
            value={settings.restaurantName}
            onChange={(e) => update("restaurantName", sanitizeText(e.target.value, 100))}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Invoice Prefix" required>
            <input
              value={settings.invoicePrefix}
              onChange={(e) => update("invoicePrefix", sanitizeText(e.target.value, 10))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <FormField label="Tax Rate (%)" required>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.taxRate}
              onChange={(e) => update("taxRate", sanitizeNumber(e.target.value, { min: 0, max: 100 }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
        </div>

        <FormField label="Public Token Board — Client Identifier" required>
          <select
            value={settings.displayNameOnBoard}
            onChange={(e) => update("displayNameOnBoard", e.target.value)}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="token_only">Token / Order Number only (most private)</option>
            <option value="first_name">First name only</option>
            <option value="employee_id">Employee ID</option>
          </select>
        </FormField>

        <div className="space-y-2">
          <Toggle label="Email Notifications" checked={settings.emailNotifications} onChange={(v) => update("emailNotifications", v)} />
          <Toggle label="SMS Notifications (Future)" checked={settings.smsNotifications} onChange={(v) => update("smsNotifications", v)} />
        </div>

        <Button type="submit" variant="primary" icon={Save} fullWidth loading={saving} success={saved}>
          {saved ? "Saved" : "Save Settings"}
        </Button>
      </form>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-ink-50 px-3 py-2.5 text-sm">
      <span className="text-ink-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-brand-600"
      />
    </label>
  );
}