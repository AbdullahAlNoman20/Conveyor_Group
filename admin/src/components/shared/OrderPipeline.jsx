import { Check, Clock, AlertTriangle, XCircle } from "lucide-react";

// Single source of truth for the order lifecycle used across the whole app.
// A self-placed Client/Guest order starts at "awaiting_manager"; a
// Manager-created order (New Order form) starts at "pending" since the
// Manager has already approved it just by creating it.
export const ORDER_STEPS = [
  { key: "awaiting_manager", label: "Manager Approval" },
  { key: "pending", label: "Kitchen Approval" },
  { key: "accepted", label: "Kitchen Accepted" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Completed" },
];

export function orderStatusLabel(status) {
  const map = {
    awaiting_manager: "Waiting for Manager Approval",
    pending: "Waiting for Kitchen Approval",
    accepted: "Accepted by Kitchen",
    preparing: "Preparing",
    ready: "Ready for Collection",
    completed: "Completed",
    delayed: "Delayed",
    cancelled: "Cancelled",
    rejected: "Rejected",
  };
  return map[status] || status;
}

/**
 * Compact variant: a single-line badge-style label, used in list rows
 * (Manager/Kitchen order lists) where a full stepper would be too wide.
 */
export function PipelineBadge({ status }) {
  if (status === "cancelled" || status === "rejected") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-500">
        <XCircle size={12} /> {orderStatusLabel(status)}
      </span>
    );
  }
  if (status === "delayed") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
        <AlertTriangle size={12} /> Delayed
      </span>
    );
  }
  const idx = ORDER_STEPS.findIndex((s) => s.key === status);
  const label = orderStatusLabel(status);
  const isDone = status === "completed";
  const isReady = status === "ready";
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isDone
          ? "bg-ink-200 text-ink-700"
          : isReady
          ? "bg-emerald-100 text-emerald-700"
          : idx <= 0
          ? "bg-amber-100 text-amber-700"
          : "bg-sky-100 text-sky-700"
      }`}
    >
      {isDone ? <Check size={12} /> : <Clock size={12} />} {label}
    </span>
  );
}

/**
 * Full stepper: used on the Client's own order-progress widget and anywhere
 * we want to show the whole journey, not just the current stage.
 */
export default function OrderPipeline({ status }) {
  if (status === "cancelled" || status === "rejected") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-ink-100 px-4 py-3 text-sm text-ink-600">
        <XCircle size={18} className="text-ink-400" />
        This order was {status === "rejected" ? "rejected by the Manager" : "cancelled"}.
      </div>
    );
  }

  const currentIdx = ORDER_STEPS.findIndex((s) => s.key === status);
  const effectiveIdx = currentIdx === -1 ? 0 : currentIdx;

  return (
    <div>
      {status === "delayed" && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
          <AlertTriangle size={14} /> This order has been marked as delayed by the kitchen.
        </div>
      )}
      <div className="flex items-center">
        {ORDER_STEPS.map((step, i) => {
          const done = i < effectiveIdx || status === "completed";
          const current = i === effectiveIdx && status !== "completed";
          return (
            <div key={step.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-emerald-600 text-white"
                      : current
                      ? "bg-brand-600 text-white ring-4 ring-brand-100"
                      : "bg-ink-100 text-ink-400"
                  }`}
                >
                  {done ? <Check size={14} /> : i + 1}
                </div>
                <span
                  className={`w-16 text-center text-[10px] leading-tight ${
                    current ? "font-bold text-ink-900" : done ? "text-ink-600" : "text-ink-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < ORDER_STEPS.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 ${done ? "bg-emerald-500" : "bg-ink-100"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
