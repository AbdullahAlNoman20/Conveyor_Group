// FILE: src/components/shared/DateRangeFilter.jsx  (NEW)
import { useMemo, useState } from "react";
import { Calendar } from "lucide-react";

const PRESETS = ["Today", "This Week", "This Month", "This Year", "Custom Range"];

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Returns { from: Date, to: Date } (inclusive) for the selected preset. */
export function resolveRange(preset, customFrom, customTo) {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  switch (preset) {
    case "Today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: endOfToday };
    }
    case "This Week":
      return { from: startOfWeek(now), to: endOfToday };
    case "This Month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfToday };
    case "This Year":
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfToday };
    case "Custom Range": {
      const from = customFrom ? new Date(customFrom) : new Date(0);
      const to = customTo ? new Date(new Date(customTo).setHours(23, 59, 59, 999)) : endOfToday;
      return { from, to };
    }
    default:
      return { from: new Date(0), to: endOfToday };
  }
}

/** Hook form: gives you the resolved { from, to } plus the picker UI to render. */
export function useDateRangeFilter(defaultPreset = "This Month") {
  const [preset, setPreset] = useState(defaultPreset);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => resolveRange(preset, customFrom, customTo), [preset, customFrom, customTo]);

  return { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range };
}

export default function DateRangeFilter({ preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 bg-white p-3">
      <Calendar size={16} className="text-ink-400" />
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              preset === p ? "bg-brand-600 text-white" : "text-ink-500 hover:bg-ink-50"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      {preset === "Custom Range" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-ink-200 px-2 py-1 text-xs outline-none focus:border-brand-500"
          />
          <span className="text-xs text-ink-400">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-ink-200 px-2 py-1 text-xs outline-none focus:border-brand-500"
          />
        </div>
      )}
      <span className="ml-auto text-xs text-ink-400">
        {range.from.toLocaleDateString()} – {range.to.toLocaleDateString()}
      </span>
    </div>
  );
}