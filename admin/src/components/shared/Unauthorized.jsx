import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROLE_HOME_ROUTE } from "../constants/roles";

export default function Unauthorized() {
  const { user } = useAuth();
  const homeRoute = user ? ROLE_HOME_ROUTE[user.role] || "/" : "/";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-50 px-6 text-center">
      <ShieldAlert size={56} className="text-brand-600" />
      <h1 className="text-2xl font-bold text-ink-900">You don't have access to this page</h1>
      <p className="max-w-md text-sm text-ink-500">
        Your account role doesn't include permission for this section. If you believe this
        is a mistake, contact your Super Admin.
      </p>
      <Link
        to={homeRoute}
        className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Back to my dashboard
      </Link>
    </div>
  );
}
