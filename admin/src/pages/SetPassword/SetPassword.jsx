// admin/src/pages/SetPassword/SetPassword.jsx
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { KeyRound, Eye, EyeOff, ShieldAlert, CheckCircle2 } from "lucide-react";
import { apiPost } from "../../components/services/api";
import { useAuth } from "../../components/hooks/useAuth";
import { useToast } from "../../components/hooks/useToast";
import FormField from "../../components/shared/FormField";
import logo from "../../assets/logo.jpeg";

const RULES = [
  { test: (v) => v.length >= 10, label: "At least 10 characters" },
  { test: (v) => /[a-z]/.test(v), label: "One lowercase letter" },
  { test: (v) => /[A-Z]/.test(v), label: "One uppercase letter" },
  { test: (v) => /[0-9]/.test(v), label: "One digit" },
];

/**
 * Shown to accounts created by the Excel import, whose temporary password is
 * their own email address. The server blocks every other endpoint until this
 * completes, so there is no "skip" — and no current-password field, because
 * re-typing a publicly-guessable value proves nothing.
 */
export default function SetPassword() {
  const { user, logout } = useAuth();
  const { push } = useToast();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword && !done) return <Navigate to="/" replace />;

  const passed = RULES.map((r) => r.test(password));
  const allPassed = passed.every(Boolean);
  const isOwnEmail = password.trim().toLowerCase() === (user.email || "").toLowerCase();

  async function submit(e) {
    e.preventDefault();

    const next = {};
    if (!allPassed) next.password = "Password doesn't meet all the requirements yet.";
    else if (isOwnEmail) next.password = "Choose something other than your email address.";
    if (confirm !== password) next.confirm = "Passwords don't match.";

    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await apiPost("/auth/password/initial", { newPassword: password });
      setDone(true);
      push("Password set. Please sign in with your new password.", "success");
      // Every session is revoked server-side, so a fresh sign-in is required.
      setTimeout(() => {
        logout().finally(() => window.location.replace("/login"));
      }, 1600);
    } catch (err) {
      push(err?.message || "Couldn't set your password. Please try again.", "error");
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-ink-200 px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-ink-950">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/videos/hero_bg.webm"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-ink-950/80" />

      <div className="relative flex min-h-screen flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
          <div className="mb-5 flex flex-col items-center gap-2 text-center">
            <img src={logo} alt="Conveyor Group" className="h-12 w-auto sm:h-14" />
            <h1 className="mt-1 text-lg font-bold text-ink-900 sm:text-xl">
              {done ? "Password Set" : "Set Your Password"}
            </h1>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 size={40} className="text-emerald-600" />
              <p className="text-sm leading-6 text-ink-600">
                Your password has been saved. Taking you to the sign-in page…
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
                <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                <span>
                  Your account was created with a temporary password. Choose a
                  new one to continue — you can't use the system until you do.
                </span>
              </div>

              <p className="mb-4 truncate rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">
                Signed in as{" "}
                <span className="font-semibold text-ink-800">{user.email}</span>
              </p>

              <form onSubmit={submit} noValidate className="space-y-4">
                <FormField label="New Password" htmlFor="pw" error={errors.password} required>
                  <div className="relative">
                    <input
                      id="pw"
                      type={show ? "text" : "password"}
                      autoComplete="new-password"
                      maxLength={128}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                      aria-label={show ? "Hide password" : "Show password"}
                    >
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </FormField>

                <ul className="space-y-1">
                  {RULES.map((rule, i) => (
                    <li
                      key={rule.label}
                      className={`flex items-center gap-1.5 text-xs ${
                        passed[i] ? "text-emerald-600" : "text-ink-400"
                      }`}
                    >
                      <CheckCircle2 size={12} className="shrink-0" />
                      {rule.label}
                    </li>
                  ))}
                </ul>

                <FormField label="Confirm Password" htmlFor="pw2" error={errors.confirm} required>
                  <input
                    id="pw2"
                    type="password"
                    autoComplete="new-password"
                    maxLength={128}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    placeholder="••••••••"
                  />
                </FormField>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <KeyRound size={16} />
                  {saving ? "Saving..." : "Set Password & Continue"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}