// FILE: src/components/layout/Sidebar.jsx (MODIFIED, full rewrite — adds desktop collapse)
import { NavLink, Link } from "react-router-dom";
import { X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import logo from "../../assets/logo.jpeg";

export default function Sidebar({ navGroups, roleLabel, open, onClose, collapsed, onToggleCollapse }) {
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
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-ink-100 bg-white transition-all lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-20" : "w-72"}`}
      >
        <div className={`flex items-center border-b border-ink-100 px-4 py-4 ${collapsed ? "justify-center" : "justify-between"}`}>
          <Link to="/" className="flex items-center gap-2 overflow-hidden" title="Back to Home">
            <img src={logo} alt="Conveyor Group" className="h-8 w-8 shrink-0 rounded object-cover" />
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink-400">CCCMS</p>
                <p className="truncate text-sm font-bold text-ink-900">{roleLabel}</p>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button onClick={onClose} className="lg:hidden" aria-label="Close menu">
              <X size={20} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden items-center justify-center gap-2 border-b border-ink-100 py-2 text-xs font-semibold text-ink-500 hover:bg-ink-50 lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>

        <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-ink-300">
                  {group.title}
                </p>
              )}
              <div className="mt-2 space-y-1">
                {group.items.map(({ to, label, Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onClose}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        collapsed ? "justify-center" : ""
                      } ${
                        isActive
                          ? "bg-brand-600 text-white"
                          : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                      }`
                    }
                  >
                    {Icon && <Icon size={17} className="shrink-0" />}
                    {!collapsed && label}
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