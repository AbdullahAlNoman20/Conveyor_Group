import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, LogIn, UtensilsCrossed, Monitor } from "lucide-react";
import logo from "../assets/logo.jpeg";

const LINKS = [
  { to: "/#weekly-meals", label: "Weekly Meals" },
  { to: "/#menu", label: "Lunch Menu" },
  { to: "/#how-it-works", label: "How it Works" },
  { to: "/kitchen/board", label: "Live Board", Icon: Monitor },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-white/95 backdrop-blur transition-shadow ${
        scrolled ? "border-ink-100 shadow-sm" : "border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="Conveyor Group" className="h-9 w-auto" />
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-sm font-bold text-ink-900">Conveyor Group</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
              Cafeteria
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.label}
              to={l.to}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-brand-600"
            >
              {l.Icon && <l.Icon size={14} />}
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden md:block">
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <LogIn size={16} /> Sign In
          </Link>
        </div>

        <button
          className="rounded-lg p-2 text-ink-700 hover:bg-ink-50 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      <div
        className={`overflow-hidden border-t border-ink-100 bg-white transition-[max-height] duration-200 md:hidden ${
          open ? "max-h-96" : "max-h-0 border-t-0"
        }`}
      >
        <div className="flex flex-col gap-1 px-4 py-3">
          {LINKS.map((l) => (
            <NavLink
              key={l.label}
              to={l.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50"
            >
              {l.Icon && <l.Icon size={15} />}
              {l.label}
            </NavLink>
          ))}
          <Link
            to="/login"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <LogIn size={16} /> Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}
