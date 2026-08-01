import { NavLink, Link } from "react-router-dom";
import { X } from "lucide-react";
import logo from "../../assets/logo.jpeg";

/**
 * Shared, role-agnostic sidebar. Each role's layout passes its own
 * `navGroups` (array of { title, items: [{ to, label, Icon }] }) so every
 * module's full page list from the SRS can be enumerated here — pages not
 * yet built in this iteration simply render <ComingSoon /> at their route.
 */
export default function Sidebar({ navGroups, roleLabel, open, onClose }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-ink-100 bg-white transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2" title="Back to Home">
              <img src={logo} alt="Conveyor Group" className="h-8 w-auto" />
              <div>
                <p className="text-xs font-semibold text-ink-400">CCCMS</p>
                <p className="text-sm font-bold text-ink-900">{roleLabel}</p>
              </div>
            </Link>
          </div>
          <button onClick={onClose} className="lg:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-ink-300">
                {group.title}
              </p>
              <div className="mt-2 space-y-1">
                {group.items.map(({ to, label, Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-600 text-white"
                          : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                      }`
                    }
                  >
                    {Icon && <Icon size={17} />}
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
