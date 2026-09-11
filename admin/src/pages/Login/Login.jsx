import { useEffect, useRef, useState } from "react";
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
import logo from "../../assets/logo.jpeg";

// Dev-only. These are the accounts scripts/seed.ts creates — hardcoded on
// purpose so the login page never has to fetch a user list from the API
// (that endpoint used to expose every account in the database publicly).
const SHOW_DEMO_ACCOUNTS = import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === "true";
const DEMO_PASSWORD = "Demo@123";

const SEED_ACCOUNTS = [
  { id: "U-001", name: "Rafiq Ahmed", email: "superadmin@conveyorgroup.com", role: "super_admin" },
  { id: "U-002", name: "Nadia Islam", email: "manager@conveyorgroup.com", role: "manager" },
  { id: "U-003", name: "Arif Hasan", email: "arif.manager@conveyorgroup.com", role: "manager" },
  { id: "U-005", name: "Farzana Karim", email: "client@conveyorgroup.com", role: "client" },
  { id: "U-006", name: "Tanvir Rahman", email: "tanvir.rahman@conveyorgroup.com", role: "client" },
  { id: "U-007", name: "Sabrina Yasmin", email: "sabrina.yasmin@conveyorgroup.com", role: "client" },
];

export default function Login() {
  const { user, login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoUsers, setDemoUsers] = useState([]);

  const mountedWithSession = useRef(Boolean(user));
  const justSignedIn = useRef(false);

  useEffect(() => {
    setDemoUsers(SHOW_DEMO_ACCOUNTS ? SEED_ACCOUNTS : []);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    const clean = {
      email: sanitizeEmail(form.email),
      password: form.password,
    };

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

    justSignedIn.current = true;
    push(`Welcome back, ${result.user.name}!`, "success");
  }

  useEffect(() => {
    if (!user) return;

    // Only bounce to the dashboard for a session that already existed when
    // this page mounted, or one created by the form below. A session that
    // reappears afterwards means a logout didn't stick, and silently
    // redirecting would trap the user in a loop.
    if (!mountedWithSession.current && !justSignedIn.current) return;

    // Imported accounts land on the set-password screen instead of a dashboard
    // they aren't allowed to load yet.
    if (user.mustChangePassword) {
      navigate("/set-password", { replace: true });
      return;
    }

    const roleHome = ROLE_HOME_ROUTE[user.role] || "/";
    const requestedFrom = location.state?.from?.pathname;

    const redirectTo =
      requestedFrom && requestedFrom.startsWith(roleHome)
        ? requestedFrom
        : roleHome;

    navigate(redirectTo, { replace: true });
  }, [user, location.state, navigate]);

  function fillDemo(email) {
    setForm({
      email,
      password: DEMO_PASSWORD,
    });

    setErrors({});
  }

  if (user && (mountedWithSession.current || justSignedIn.current)) {
    return <Loader full label="Redirecting..." />;
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-ink-950">
      {/* Background Video */}
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

      {/* Overlay */}
      <div className="absolute inset-0 bg-ink-950/80" />

      {/* Main */}
      <div className="relative flex min-h-screen flex-1 items-center justify-center px-5 py-16 sm:px-8 sm:py-10">
        {/* Back Button */}
        <Link
          to="/"
          className="
            absolute left-3 top-4
            inline-flex items-center gap-1
            rounded-lg px-2 py-1
            text-xs text-ink-300
            transition-colors hover:text-white
            sm:left-6 sm:top-6 sm:text-sm
          "
        >
          <ArrowLeft size={15} />
          <span>Back to home</span>
        </Link>

        {/* Main Grid */}
        <div
          className={`
            grid w-full
            ${SHOW_DEMO_ACCOUNTS ? "max-w-5xl lg:grid-cols-2" : "max-w-md"}
            grid-cols-1
            gap-4
            sm:gap-6
          `}
        >
          {/* ================= LOGIN CARD ================= */}
          <div
            className="
              w-full min-w-0
              rounded-2xl
              bg-white
              p-5
              shadow-2xl
              sm:p-7
              lg:p-8
            "
          >
            {/* Logo */}
            <div className="mb-5 flex flex-col items-center gap-2 text-center sm:mb-6">
              <img
                src={logo}
                alt="Conveyor Group"
                className="h-12 w-auto sm:h-14"
              />

              <p className="max-w-sm text-xs leading-relaxed text-ink-500 sm:text-sm">
                Corporate Cashless Cafeteria & QR Meal Management
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <FormField
                label="Email Address"
                htmlFor="email"
                error={errors.email}
                required
              >
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  maxLength={254}
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      email: e.target.value,
                    }))
                  }
                  className="
                    w-full min-w-0
                    rounded-lg
                    border border-ink-200
                    px-3 py-2.5
                    text-sm
                    outline-none
                    transition


                    focus:ring-brand-100
                  "
                  placeholder="you@conveyorgroup.com"
                />
              </FormField>

              <FormField
                label="Password"
                htmlFor="password"
                error={errors.password}
                required
              >
                <div className="relative w-full">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    maxLength={128}
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        password: e.target.value,
                      }))
                    }
                    className="
                      w-full min-w-0
                      rounded-lg
                      border border-ink-200
                      px-3 py-2.5 pr-11
                      text-sm
                      outline-none
                      transition


                      focus:ring-brand-100
                    "
                    placeholder="••••••••"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="
                      absolute right-2.5 top-1/2
                      flex h-8 w-8
                      -translate-y-1/2
                      items-center justify-center
                      rounded-md
                      text-ink-400
                      transition
                      hover:bg-ink-50
                      hover:text-ink-600
                    "
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </FormField>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="
                  flex w-full
                  items-center justify-center gap-2
                  rounded-lg
                  bg-brand-600
                  px-4 py-3
                  text-sm font-semibold text-white
                  transition-colors
                  hover:bg-brand-700
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  sm:py-2.5
                "
              >
                <LogIn size={16} />

                <span>{submitting ? "Signing in..." : "Sign In"}</span>
              </button>
            </form>

            {/* Register */}
            <p className="mt-4 text-center text-xs leading-relaxed text-ink-500 sm:text-sm">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                Register Now
              </Link>
            </p>
          </div>

          {/* ================= TESTING ACCOUNTS ================= */}
          <div
            className={`
              ${SHOW_DEMO_ACCOUNTS ? "" : "hidden"}
              w-full min-w-0
              rounded-2xl
              border-2 border-dashed border-amber-400/60
              bg-white/95
              p-5
              shadow-2xl
              sm:p-6
            `}
          >
            {/* Header */}
            <div className="mb-3 flex items-center gap-2 text-amber-600 sm:mb-4">
              <FlaskConical size={18} className="shrink-0" />

              <p className="text-xs font-bold uppercase tracking-wide sm:text-sm">
                Testing Accounts
              </p>
            </div>

            <p className="mb-4 text-xs leading-relaxed text-ink-500">
              Click any account to auto-fill its credentials. These are the
              seeded development accounts — set VITE_ENABLE_DEMO_ACCOUNTS=false
              to hide this panel.
            </p>

            {/* Demo Users */}
            <div className="space-y-2">
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => fillDemo(u.email)}
                  className="
                    flex w-full min-w-0
                    flex-col
                    items-start
                    gap-3
                    rounded-lg
                    border border-ink-100
                    px-3 py-3
                    text-left
                    transition
                    hover:border-brand-300
                    hover:bg-brand-50
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  {/* User */}
                  <span className="flex min-w-0 w-full items-center gap-2">
                    <AvatarImage name={u.name} photo={u.photo} size={32} />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-900">
                        {u.name}
                      </span>

                      <span className="block truncate text-xs text-ink-400">
                        {ROLE_LABELS[u.role]}
                      </span>
                    </span>
                  </span>

                  {/* Credentials */}
                  <span
                    className="
                      w-full
                      min-w-0
                      border-t border-ink-100
                      pt-2
                      text-left
                      text-xs
                      text-ink-500
                      sm:w-auto
                      sm:border-t-0
                      sm:pt-0
                      sm:text-right
                    "
                  >
                    <span className="block break-all">{u.email}</span>

                    <span className="block font-mono text-brand-600">
                      {DEMO_PASSWORD}
                    </span>
                  </span>
                </button>
              ))}

              {demoUsers.length === 0 && (
                <p className="py-3 text-center text-xs text-ink-400">
                  Testing accounts are disabled.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
