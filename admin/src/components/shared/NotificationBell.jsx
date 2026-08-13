// FILE: src/components/shared/NotificationBell.jsx  (MODIFIED, full rewrite)
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronRight } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import Button from "./Button";

export default function NotificationBell() {
  const { items, unreadCount, markAllRead, markOneRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleItemClick(n) {
    markOneRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="icon"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) markAllRead();
        }}
        aria-label="Notifications"
        className="relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-ink-100 bg-white p-2 shadow-xl">
          <p className="px-2 py-1.5 text-xs font-semibold uppercase text-ink-400">
            Notifications {items.length > 0 && `(${items.length})`}
          </p>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-ink-400">
                You're all caught up.
              </p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleItemClick(n)}
                disabled={!n.link}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm text-ink-600 hover:bg-ink-50 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className="flex-1">{n.message}</span>
                {n.link && <ChevronRight size={14} className="shrink-0 text-ink-300" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}