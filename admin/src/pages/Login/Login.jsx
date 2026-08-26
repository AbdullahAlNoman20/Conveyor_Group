import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Eye, EyeOff, LogIn, FlaskConical, ArrowLeft } from "lucide-react";
import { useAuth } from "../../components/hooks/useAuth";
import { useToast } from "../../components/hooks/useToast";
import { validateLoginForm } from "../../components/utils/validators";
import { sanitizeEmail } from "../../components/utils/sanitize";
import FormField from "../../components/shared/FormField";
import Loader from "../../components/shared/Loader";
import AvatarImage from "../../components/shared/AvatarImage";
import { ROLE_HOME_ROUTE, ROLE_LABELS } from "../../components/constants/roles";
import { dataStore } from "../../components/services/dataStore";
import Footer from "../../components/Footer";
import logo from "../../assets/logo.jpeg";

const DEMO_PASSWORD = "Demo@123";

export default function Login() {
  const { user, login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoUsers, setDemoUsers] = useState([]);

  useEffect(() => {
    (async () => {
      const users = await dataStore.load("users", "users.json");
      setDemoUsers(users.filter((u) => u.status === "active"));
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const clean = { email: sanitizeEmail(form.email), password: form.password };
    const { valid, errors: validationErrors } = validateLoginForm(clean);
    setErrors(validationErrors);
    if (!valid) return;

    setSubmitting(true);
    const result = await login(clean.email, clean.password);
    setSubmitting(false);

    if (!result.success) {
      push(result.message, "error");
      return;
    }
    push(`Welcome back, ${result.user.name}!`, "success");
    // Deliberately not navigating here. Calling navigate() immediately after
    // login() resolves can race ahead of the AuthContext re-render that
    // actually propagates the new `user` to RoleRoute — RoleRoute would then
    // briefly read the OLD (or null) user on the very first render of the
    // destination route and bounce to /unauthorized, which only cleared on a
    // manual reload. The effect below fires only once `user` has actually
    // updated, which removes that race.
  }

  useEffect(() => {
    if (!user) return;
    const roleHome = ROLE_HOME_ROUTE[user.role] || "/";
    const requestedFrom = location.state?.from?.pathname;
    // Only honor a "come back to where you were" redirect if that path
    // actually belongs to this role's own area — otherwise a stale redirect
    // captured from a *different* account's session (e.g. after switching
    // users without navigating away first) would send the new user into a
    // route that isn't theirs, which RoleRoute would then correctly block.
    const redirectTo =
      requestedFrom && requestedFrom.startsWith(roleHome) ? requestedFrom : roleHome;
    navigate(redirectTo, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function fillDemo(email) {
    setForm({ email, password: DEMO_PASSWORD });
    setErrors({});
  }

  // IMPORTANT: this early return must come AFTER every Hook call above.
  // It previously sat between the two useEffect() calls — the moment `user`
  // became truthy (right after a successful login), this component would
  // call one fewer Hook than it did on the render before, which is a Rules
  // of Hooks violation. React throws in that case, and that thrown error is
  // exactly what was bouncing the app to the custom error page on login.
  if (user) return <Loader full label="Redirecting..." />;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-ink-950 via-ink-900 to-brand-950">
      <div className="relative flex flex-1 items-center justify-center px-4 py-10">
      <Link
        to="/"
        className="absolute left-4 top-4 flex items-center gap-1 text-sm text-ink-300 hover:text-white sm:left-6 sm:top-6"
      >
        <ArrowLeft size={16} /> Back to home
      </Link>

      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <img src={logo} alt="Conveyor Group" className="h-14 w-auto" />
            <p className="text-sm text-ink-500">Corporate Cashless Cafeteria & QR Meal Management</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField label="Email Address" htmlFor="email" error={errors.email} required>
              <input
                id="email"
                type="email"
                autoComplete="username"
                maxLength={254}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="you@conveyorgroup.com"
              />
            </FormField>

            <FormField label="Password" htmlFor="password" error={errors.password} required>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  maxLength={128}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2.5 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </FormField>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={16} /> {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-500">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
              Register Now
            </Link>
          </p>
        </div>

        <div className="rounded-2xl border-2 border-dashed border-amber-400/60 bg-white/95 p-6 shadow-2xl">
          <div className="mb-4 flex items-center gap-2 text-amber-600">
            <FlaskConical size={18} />
            <p className="text-sm font-bold uppercase tracking-wide">Testing Accounts</p>
          </div>
          <p className="mb-4 text-xs text-ink-500">
            Click any account below to auto-fill its login credentials (design/testing phase —
            no real backend is connected yet).
          </p>
          <div className="space-y-2">
            {demoUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => fillDemo(u.email)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-ink-100 px-3 py-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50"
              >
                <span className="flex items-center gap-2">
                  <AvatarImage name={u.name} size={32} />
                  <span>
                    <span className="block text-sm font-medium text-ink-900">{u.name}</span>
                    <span className="block text-xs text-ink-400">{ROLE_LABELS[u.role]}</span>
                  </span>
                </span>
                <span className="text-right text-xs text-ink-500">
                  <span className="block">{u.email}</span>
                  <span className="block font-mono text-brand-600">{DEMO_PASSWORD}</span>
                </span>
              </button>
            ))}
            {demoUsers.length === 0 && (
              <p className="text-xs text-ink-400">Loading testing accounts...</p>
            )}
          </div>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}
