// FILE: src/components/shared/CompletedOrderSteps.jsx
import { Check } from "lucide-react";

// The approval pipeline is gone: the fixed meal is pre-made, so an order is
// confirmed and ready the moment it's placed. These three steps are all that
// actually happen now.
const STEPS = ["Order Placed", "Confirmed", "Ready for Collection"];

export default function CompletedOrderSteps() {
  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      {/* Desktop / Tablet Pipeline */}
      <div className="hidden sm:flex sm:items-start">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className="flex min-w-0 flex-1 items-start last:flex-none"
          >
            <div className="flex min-w-0 flex-col items-center gap-1">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check size={14} />
              </div>

              <span className="w-16 text-center text-[10px] leading-tight text-ink-600">
                {label}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <div className="mx-1 mt-3 h-0.5 min-w-2 flex-1 bg-emerald-500" />
            )}
          </div>
        ))}
      </div>

      {/* Mobile Pipeline */}
      <div className="sm:hidden">
        <div className="space-y-0">
          {STEPS.map((label, i) => (
            <div key={label} className="flex min-w-0 items-stretch">
              {/* Step indicator + connector */}
              <div className="flex w-8 shrink-0 flex-col items-center">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Check size={14} />
                </div>

                {i < STEPS.length - 1 && (
                  <div className="w-0.5 flex-1 bg-emerald-500" />
                )}
              </div>

              {/* Step label */}
              <div
                className={`min-w-0 flex-1 ${
                  i < STEPS.length - 1 ? "pb-5" : ""
                }`}
              >
                <div className="flex min-h-7 items-center pl-3">
                  <span className="break-words text-xs font-medium leading-5 text-ink-600">
                    {label}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}