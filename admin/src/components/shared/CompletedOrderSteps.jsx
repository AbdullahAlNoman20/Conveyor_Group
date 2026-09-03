// FILE: src/components/shared/CompletedOrderSteps.jsx (NEW)
import { Check } from "lucide-react";

// Since orders now resolve instantly (no manager-approval waiting period),
// every step in the flow is already true by the time the client sees this
// order — but the SRS still wants the full step list VISIBLE, each one
// marked done, rather than collapsing to a single "Completed" badge. This
// mirrors the shape of the old OrderPipeline.ORDER_STEPS list.
const STEPS = [
  "Order Placed",
  "Manager Approved",
  "Kitchen Accepted",
  "Prepared",
  "Ready",
  "Completed",
];

export default function CompletedOrderSteps() {
  return (
    <div>
      <div className="flex items-center">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check size={14} />
              </div>
              <span className="w-16 text-center text-[10px] leading-tight text-ink-600">{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="mx-1 h-0.5 flex-1 bg-emerald-500" />}
          </div>
        ))}
      </div>
    </div>
  );
}