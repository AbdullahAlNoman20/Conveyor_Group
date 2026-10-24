// admin/src/components/shared/DevPanel.jsx
import { useEffect, useState } from "react";
import {
  FlaskConical, X, Clock, ChevronLeft, ChevronRight, RotateCcw,
  Database, Trash2, FastForward, Loader2,
} from "lucide-react";
import { apiGet, apiPost } from "../services/api";
import { usePermission } from "../hooks/usePermission";
import { useToast } from "../hooks/useToast";
import { syncDevClock } from "../utils/devClock";
/**
 * Local-development control panel.
 *
 * The whole point is the clock: every limit in the app (one meal a day, the
 * 6 AM cancellation cutoff, the 11–6 serving window, the end-of-day charge)
 * is derived from a single clock, so moving it is enough to test all of them
 * in minutes. The server refuses to enable these endpoints in production.
 */
export default function DevPanel() {
  const { devTools } = usePermission();
  const { push } = useToast();

  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState(null);
  const [busy, setBusy] = useState("");
  const [historyDays, setHistoryDays] = useState(30);

  useEffect(() => {
    if (!devTools || !open) return;
    apiGet("/dev/clock").then(setClock).catch(() => setClock(null));
  }, [devTools, open]);

  if (!devTools) return null;

  async function run(label, fn, successMessage) {
    setBusy(label);
    try {
      const result = await fn();
      if (result?.businessDate) setClock(result);
      else setClock(await apiGet("/dev/clock").catch(() => clock));
      push(successMessage, "success");
      // Moves this tab to the new day right away. Other tabs and phones
      // follow within 20 seconds.
      await syncDevClock();
      // A clock jump changes what nearly every screen should show.
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      push(err?.message || "That didn't work.", "error");
    } finally {
      setBusy("");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[80] flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-amber-600"
      >
        <FlaskConical size={15} />
        Dev Tools
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[80] w-[calc(100vw-2rem)] max-w-sm rounded-2xl border-2 border-amber-400 bg-white p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-amber-700">
          <FlaskConical size={15} /> Development Tools
        </p>
        <button
          onClick={() => setOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>

      {/* Clock */}
      <div className="rounded-lg bg-ink-50 p-3">
        <p className="flex items-center gap-1.5 text-xs font-bold text-ink-700">
          <Clock size={13} /> Simulated Clock
        </p>

        {clock ? (
          <>
            <p className="mt-2 text-lg font-bold text-ink-900">{clock.businessDate}</p>
            <p className="text-xs text-ink-500">
              {String(clock.localHour).padStart(2, "0")}:00 · {clock.timezone}
              {clock.offsetDays !== 0 && ` · ${clock.offsetDays > 0 ? "+" : ""}${clock.offsetDays}d`}
            </p>
            <p className="mt-1 text-xs text-ink-400">
              Ordering {clock.orderWindowOpen ? "OPEN" : "closed"} · {clock.orderWindow}
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-ink-400">Loading…</p>
        )}

        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <button
            onClick={() => run("day-1", () => apiPost("/dev/clock/advance", { days: -1 }), "Moved back a day")}
            disabled={!!busy}
            className="flex h-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-xs font-semibold transition hover:bg-ink-100 disabled:opacity-50"
          >
            <ChevronLeft size={14} /> 1d
          </button>

          <button
            onClick={() => run("day+1", () => apiPost("/dev/clock/advance", { days: 1 }), "Moved forward a day")}
            disabled={!!busy}
            className="flex h-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-xs font-semibold transition hover:bg-ink-100 disabled:opacity-50"
          >
            1d <ChevronRight size={14} />
          </button>

          <button
            onClick={() => run("day+7", () => apiPost("/dev/clock/advance", { days: 7 }), "Moved forward a week")}
            disabled={!!busy}
            className="flex h-9 items-center justify-center gap-0.5 rounded-lg border border-ink-200 bg-white text-xs font-semibold transition hover:bg-ink-100 disabled:opacity-50"
          >
            <FastForward size={12} /> 7d
          </button>

          <button
            onClick={() => run("reset", () => apiPost("/dev/clock", { reset: true }), "Back to real time")}
            disabled={!!busy}
            className="flex h-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-500 transition hover:bg-ink-100 disabled:opacity-50"
            title="Back to real time"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Hour jumps hit the three time-based rules directly. */}
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[
            ["3 AM", 3, "Cancellation open"],
            ["1 PM", 13, "Counter open"],
            ["7 PM", 19, "After close"],
          ].map(([label, hour, hint]) => (
            <button
              key={label}
              onClick={() =>
                run(
                  `h${hour}`,
                  () => apiPost("/dev/clock", { days: clock?.offsetDays ?? 0, hours: hour - new Date().getHours() }),
                  `Jumped to ${label}`,
                )
              }
              disabled={!!busy}
              title={hint}
              className="flex h-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-[11px] font-semibold transition hover:bg-ink-100 disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Data */}
      <div className="mt-3 space-y-2">
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            max="120"
            value={historyDays}
            onChange={(e) => setHistoryDays(e.target.value)}
            className="w-20 rounded-lg border border-ink-200 px-2 py-2 text-sm outline-none focus:border-brand-500"
          />
          <button
            onClick={() =>
              run("history", () => apiPost("/dev/history", { days: Number(historyDays) }), "Sample history generated")
            }
            disabled={!!busy}
            className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
          >
            {busy === "history" ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
            Generate days of history
          </button>
        </div>

        <button
          onClick={() => run("close", () => apiPost("/dev/close-day"), "Day closed — no-shows charged")}
          disabled={!!busy}
          className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
        >
          Close today now (charge no-shows)
        </button>

        <button
          onClick={() => run("reset-today", () => apiPost("/dev/reset-today"), "Today reset")}
          disabled={!!busy}
          className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 disabled:opacity-50"
        >
          <RotateCcw size={13} /> Reset today's orders & attendance
        </button>

        <button
          onClick={() => run("clear", () => apiPost("/dev/history/clear"), "Generated data cleared")}
          disabled={!!busy}
          className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold text-ink-500 transition hover:bg-ink-50 disabled:opacity-50"
        >
          <Trash2 size={13} /> Clear generated history
        </button>
      </div>

      <p className="mt-3 text-[10px] leading-4 text-ink-400">
        Only available with DEV_TOOLS=true. The server refuses to start with
        this flag set in production.
      </p>
    </div>
  );
}