import { Suspense, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import Sidebar from "./Sidebar";
import NotificationBell from "../shared/NotificationBell";
import Loader from "../shared/Loader";
import { useAuth } from "../hooks/useAuth";
import { ROLE_BADGE_COLOR } from "../constants/roles";

export default function DashboardLayout({ navGroups, roleLabel }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    // Navigate away immediately so we never linger on a now-stale protected
    // URL while `user` updates — that lingering was the root cause of the
    // "logout then log into a different account shows Unauthorized" bug.
    navigate("/", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar
        navGroups={navGroups}
        roleLabel={roleLabel}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <button
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <div className="hidden text-sm text-ink-400 lg:block">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="hidden items-center gap-2 sm:flex">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: user?.avatarColor || "#000" }}
              >
                {user?.name?.charAt(0)}
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-ink-900">{user?.name}</p>
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    ROLE_BADGE_COLOR[user?.role] || "bg-ink-800 text-white"
                  }`}
                >
                  {roleLabel}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              className="rounded-lg p-2 text-ink-500 hover:bg-brand-50 hover:text-brand-600"
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 board:mx-auto board:w-full board:max-w-[1800px]">
          <Suspense fallback={<Loader full label="Loading page..." />}>
            <Outlet />
          </Suspense>
        </main>

        <footer className="border-t border-ink-100 bg-white px-4 py-3 text-center text-xs text-ink-400 sm:px-6">
          © {new Date().getFullYear()} Conveyor Group Restaurant · CCCMS ·{" "}
          <a href="/" className="font-medium text-ink-500 hover:text-brand-600">
            Home
          </a>
        </footer>
      </div>
    </div>
  );
}
