// admin/src/components/shared/PeriodPicker.jsx
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MODES = [
  ["day", "Day"],
  ["month", "Month"],
  ["year", "Year"],
];

const iso = (d) => d.toISOString().slice(0, 10);

/**
 * Day, month or year, with arrows to step through them.
 *
 * Every report screen uses this one control, so the arrows mean the same
 * thing everywhere and a person only has to learn it once. The arrows matter
 * on a phone: stepping back a day is one tap, not a date dialog.
 */
export default function PeriodPicker({ value, onChange, className = "" }) {
  const today = new Date();
  const { mode = "day", date = iso(today), year = today.getFullYear(), month = today.getMonth() } = value || {};

  function step(direction) {
    if (mode === "day") {
      const d = new Date(`${date}T00:00:00`);
      d.setDate(d.getDate() + direction);
      onChange({ ...value, mode, date: iso(d) });
      return;
    }

    if (mode === "month") {
      const next = month + direction;
      // Rolling past either end moves the year, so December to January is one
      // tap rather than two separate controls.
      if (next < 0) onChange({ ...value, mode, year: year - 1, month: 11 });
      else if (next > 11) onChange({ ...value, mode, year: year + 1, month: 0 });
      else onChange({ ...value, mode, year, month: next });
      return;
    }

    onChange({ ...value, mode, year: year + direction });
  }

  function setMode(next) {
    onChange({ mode: next, date, year, month });
  }

  const label =
    mode === "day"
      ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : mode === "month"
        ? `${MONTHS[month]} ${year}`
        : String(year);

  const isToday = mode === "day" && date === iso(today);

  return (
    <div className={`flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center ${className}`}>
      {/* Mode */}
      <div className="grid w-full grid-cols-3 gap-1 rounded-lg bg-ink-50 p-1 sm:w-auto sm:flex">
        {MODES.map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors sm:py-1.5 ${
              mode === key ? "bg-white text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-700"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      {/* Stepper */}
      <div className="flex w-full min-w-0 items-center rounded-lg border border-ink-200 bg-white sm:w-auto">
        <button
          type="button"
          onClick={() => step(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-l-lg text-ink-500 transition hover:bg-ink-50"
          aria-label="Previous"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="min-w-0 flex-1 truncate px-2 text-center text-sm font-semibold text-ink-800 sm:min-w-[160px]">
          {label}
        </span>

        <button
          type="button"
          onClick={() => step(1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-r-lg text-ink-500 transition hover:bg-ink-50"
          aria-label="Next"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Jumping back to today is the commonest thing to want after browsing. */}
      {!isToday && (
        <button
          type="button"
          onClick={() => onChange({ mode: "day", date: iso(today), year: today.getFullYear(), month: today.getMonth() })}
          className="flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
        >
          <CalendarDays size={13} /> Today
        </button>
      )}
    </div>
  );
}

/** Turns the picker's state into the query string every report endpoint takes. */
export function periodQueryString(value) {
  const today = new Date();
  const { mode = "day", date = iso(today), year = today.getFullYear(), month = today.getMonth() } = value || {};

  if (mode === "day") return `mode=day&date=${date}`;
  if (mode === "month") return `mode=month&year=${year}&month=${month}`;
  return `mode=year&year=${year}`;
}

export { MONTHS };