export default function FormField({ label, htmlFor, error, required, hint, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-700">
        {label} {required && <span className="text-brand-600">*</span>}
      </label>
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
