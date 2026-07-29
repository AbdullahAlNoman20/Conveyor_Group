const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-brand-100 text-brand-700",
  pending: "bg-amber-100 text-amber-700",
  preparing: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  completed: "bg-ink-200 text-ink-700",
  delayed: "bg-brand-100 text-brand-700",
  cancelled: "bg-ink-200 text-ink-500 line-through",
  expired: "bg-ink-200 text-ink-500",
};

export default function Badge({ children, tone, className = "" }) {
  const style = STATUS_STYLES[tone] || "bg-ink-100 text-ink-700";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${style} ${className}`}
    >
      {children}
    </span>
  );
}
