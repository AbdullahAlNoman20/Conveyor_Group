import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, LogIn } from "lucide-react";
import logo from "../assets/logo.jpeg";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/#menu", label: "Menu" },
  { to: "/#how-it-works", label: "How it works" },
  { to: "/#contact", label: "Contact" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Conveyor Group" className="h-9 w-auto" />
          <span className="hidden text-sm font-semibold text-ink-500 sm:inline">
            CCCMS
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.label}
              to={l.to}
              className="text-sm font-medium text-ink-600 hover:text-brand-600"
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden md:block">
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <LogIn size={16} /> Sign In
          </Link>
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-ink-100 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-3">
            {LINKS.map((l) => (
              <NavLink
                key={l.label}
                to={l.to}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-ink-600"
              >
                {l.label}
              </NavLink>
            ))}
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            >
              <LogIn size={16} /> Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
