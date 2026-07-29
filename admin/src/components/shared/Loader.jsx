export default function Loader({ label = "Loading...", full = false }) {
  return (
    <div
      className={
        full
          ? "flex min-h-[60vh] flex-col items-center justify-center gap-3"
          : "flex items-center justify-center gap-3 py-10"
      }
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" />
      <p className="text-sm text-ink-400">{label}</p>
    </div>
  );
}
