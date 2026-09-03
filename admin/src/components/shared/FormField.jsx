import { useState } from "react";
import { Info } from "lucide-react";

/**
 * `info` is optional: { instruction, example }. When passed, a small (i)
 * icon appears next to the label — hover shows the tooltip (desktop),
 * click toggles it open/closed (works on touch devices too).
 */
export default function FormField({ label, htmlFor, error, required, hint, info, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-700">
          {label} {required && <span className="text-brand-600">*</span>}
        </label>

        {info && (
          <div className="group relative inline-flex">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              onBlur={() => setOpen(false)}
              className="flex h-4 w-4 items-center justify-center rounded-full text-ink-400 hover:text-brand-600"
              aria-label={`Help for ${label}`}
            >
              <Info size={14} />
            </button>
            <div
              className={`absolute left-1/2 top-full z-20 mt-1.5 w-64 -translate-x-1/2 rounded-lg border border-ink-200 bg-white p-3 text-xs shadow-lg transition-opacity ${
                open
                  ? "opacity-100"
                  : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
              }`}
            >
              <p className="font-semibold text-ink-800">{info.instruction}</p>
              {info.example && (
                <p className="mt-1 text-ink-500">
                  <span className="font-medium">Example:</span> {info.example}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {children}
      {hint && !error && <p className="text-xs text-ink-400">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-brand-600">
          {error}
        </p>
      )}
    </div>
  );
}