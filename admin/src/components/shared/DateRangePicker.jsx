// admin/src/components/shared/DateRangePicker.jsx
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SHORT = MONTHS.map((m) => m.slice(0, 3));

const iso = (d) => d.toISOString().slice(0, 10);

/**
 * One picker for day, month and year, used by every report.
 *
 * Built around arrow stepping rather than a date field, because the common
 * action by far is "the day before this one". Two taps reach yesterday, where
 * a calendar popover would take four and a keyboard on a phone.
 */
export function useDateRange(initialMode = "day") {
  const today = new Date();
  const [mode, setMode] = useState(initialMode);
  const [date, setDate] = useState(iso(today));
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const range = useMemo(() => {
    if (mode === "day") return { from: date, to: date };
    if (mode === "month") {
      return {
        from: iso(new Date(Date.UTC(year, month, 1))),
        to: iso(new Date(Date.UTC(year, month + 1, 0))),
      };
    }
    return {
      from: iso(new Date(Date.UTC(year, 0, 1))),
      to: iso(new Date(Date.UTC(year, 11, 31))),
    };
  }, [mode, date, year, month]);

  const label = useMemo(() => {
    if (mode === "day") {
      const d = new Date(`${date}T00:00:00`);
      const isToday = date === iso(new Date());
      return isToday ? "Today" : d.toLocaleDateString(undefined, {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
      });
    }
    if (mode === "month") return `${MONTHS[month]} ${year}`;
    return String(year);
  }, [mode, date, year, month]);

  function step(direction) {
    if (mode === "day") {
      const d = new Date(`${date}T00:00:00`);
      d.setDate(d.getDate() + direction);
      setDate(iso(d));
      return;
    }
    if (mode === "month") {
      const next = month + direction;
      if (next < 0) {
        setMonth(11);
        setYear((y) => y - 1);
      } else if (next > 11) {
        setMonth(0);
        setYear((y) => y + 1);
      } else {
        setMonth(next);
      }
      return;
    }
    setYear((y) => y + direction);
  }

  function reset() {
    const now = new Date();
    setDate(iso(now));
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  return {
    mode, setMode, date, setDate, year, setYear, month, setMonth,
    range, label, step, reset,
    isCurrent:
      mode === "day"
        ? date === iso(today)
        : mode === "month"
          ? year === today.getFullYear() && month === today.getMonth()
          : year === today.getFullYear(),
  };
}

export default function DateRangePicker({ ctrl, className = "" }) {
  const { mode, setMode, date, setDate, year, setYear, month, setMonth } = ctrl;

  return (
    <div className={`w-full min-w-0 space-y-2 ${className}`}>
      {/* Stepper. The label itself is the context, so there is no extra
          heading above it. */}
      <div className="flex min-w-0 items-stretch gap-2">
        <button
          type="button"
          onClick={() => ctrl.step(-1)}
          aria-label="Previous"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center rounded-lg border border-ink-200 bg-white px-3">
          <CalendarDays size={15} className="mr-2 shrink-0 text-ink-400" />
          <span className="truncate text-sm font-bold text-ink-900">{ctrl.label}</span>
        </div>

        <button
          type="button"
          onClick={() => ctrl.step(1)}
          aria-label="Next"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {/* Granularity */}
        <div className="flex shrink-0 rounded-lg bg-ink-100 p-0.5">
          {["day", "month", "year"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                mode === m ? "bg-white text-brand-700 shadow-sm" : "text-ink-500"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Jumping a long way back is rare, so the exact pickers are secondary
            to the arrows above rather than the main control. */}
        {mode === "day" && (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 min-w-0 flex-1 rounded-lg border border-ink-200 px-2 text-xs outline-none transition focus:border-brand-500 sm:flex-none"
          />
        )}

        {mode === "month" && (
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-9 min-w-0 flex-1 rounded-lg border border-ink-200 px-2 text-xs outline-none transition focus:border-brand-500 sm:flex-none"
          >
            {SHORT.map((m, i) => (
              <option key={m} value={i}>{MONTHS[i]}</option>
            ))}
          </select>
        )}

        {mode !== "day" && (
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 shrink-0 rounded-lg border border-ink-200 px-2 text-xs outline-none transition focus:border-brand-500"
          >
            {[0, 1, 2, 3, 4].map((o) => {
              const y = new Date().getFullYear() - o;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        )}

        {!ctrl.isCurrent && (
          <button
            type="button"
            onClick={ctrl.reset}
            className="h-9 shrink-0 rounded-lg px-2.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
          >
            Today
          </button>
        )}
      </div>
    </div>
  );
}

export { MONTHS };