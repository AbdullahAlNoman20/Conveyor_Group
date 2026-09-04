// FILE: src/components/shared/PasswordChangeSection.jsx (NEW)
import { useState } from "react";
import { KeyRound, Eye, EyeOff, Info } from "lucide-react";

/**
 * UI-only password change form — intentionally NOT wired to any logic yet.
 * The current `users` seed data has no real, securely-stored password
 * field to verify against (design/testing phase — see dataStore.js /
 * AuthContext.jsx's shared DEMO_PASSWORD). This block exists purely so the
 * layout/UX is ready.
 *
 * TODO (backend integration): once real per-user passwords exist server
 * side, wire "Update Password" to an API call that verifies the current
 * password ON THE SERVER before writing the new one. Never do that
 * verification client-side only.
 */
export default function PasswordChangeSection() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-4 rounded-xl border border-ink-100 bg-white p-6">
      <div className="flex items-center gap-2">
        <KeyRound size={16} className="text-ink-500" />
        <h2 className="text-sm font-bold text-ink-900">Change Password</h2>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          Design/testing phase — this form isn't connected to a real backend yet. It will be
          wired up once user accounts have real, securely stored passwords in the database.
        </span>
      </div>

      <div className="space-y-3 opacity-60">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Current Password</label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              disabled
              placeholder="••••••••"
              className="w-full cursor-not-allowed rounded-lg border border-ink-200 bg-ink-50 px-3 py-2.5 pr-10 text-sm outline-none"
            />
            <button
              type="button"
              disabled
              onClick={() => setShowCurrent((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-not-allowed text-ink-300"
              aria-label="Show password"
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">New Password</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              disabled
              placeholder="••••••••"
              className="w-full cursor-not-allowed rounded-lg border border-ink-200 bg-ink-50 px-3 py-2.5 pr-10 text-sm outline-none"
            />
            <button
              type="button"
              disabled
              onClick={() => setShowNew((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-not-allowed text-ink-300"
              aria-label="Show password"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Confirm New Password</label>
          <input
            type="password"
            disabled
            placeholder="••••••••"
            className="w-full cursor-not-allowed rounded-lg border border-ink-200 bg-ink-50 px-3 py-2.5 text-sm outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        disabled
        title="Will be enabled once real passwords are wired up in the database"
        className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-ink-200 py-2.5 text-sm font-semibold text-ink-400"
      >
        <KeyRound size={16} /> Update Password
      </button>
    </div>
  );
}