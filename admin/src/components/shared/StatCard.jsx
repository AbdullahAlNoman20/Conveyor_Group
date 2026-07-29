// Static class map — Tailwind's JIT scanner requires literal class names,
// so accent colors must be listed here rather than interpolated at runtime.
const ACCENTS = {
  brand: "bg-brand-50 text-brand-600",
  ink: "bg-ink-100 text-ink-700",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
};

export default function StatCard({ label, value, Icon, accent = "brand", trend }) {
  const accentClass = ACCENTS[accent] || ACCENTS.brand;
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{value}</p>
        </div>
        {Icon && (
          <span className={`rounded-lg p-2 ${accentClass}`}>
            <Icon size={20} />
          </span>
        )}
      </div>
      {trend && <p className="mt-2 text-xs text-ink-400">{trend}</p>}
    </div>
  );
}
