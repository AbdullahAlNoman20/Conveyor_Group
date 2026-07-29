import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import logo from "../../assets/logo.jpeg";

/**
 * Pure presentational error surface — used both by RouteErrorBoundary
 * (react-router errorElement, handles 404s + route errors) and by the
 * top-level ErrorBoundary class component (catches any other runtime error).
 * Takes plain props only, so it never depends on router context and can
 * never itself throw.
 */
export default function ErrorPage({
  code = 500,
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  onHome,
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ink-950 px-6 text-center text-white">
      <img src={logo} alt="Conveyor Group" className="h-12 w-auto rounded bg-white p-1" />
      <div className="flex items-center gap-2 text-brand-500">
        <AlertTriangle size={28} />
        <span className="font-mono text-5xl font-bold">{code}</span>
      </div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="max-w-md text-sm text-ink-300">{message}</p>

      <div className="mt-2 flex gap-3">
        <button
          onClick={onRetry || (() => window.location.reload())}
          className="flex items-center gap-2 rounded-lg border border-ink-600 px-4 py-2 text-sm font-semibold hover:bg-ink-900"
        >
          <RotateCcw size={16} /> Try again
        </button>
        <button
          onClick={onHome || (() => (window.location.href = "/"))}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold hover:bg-brand-700"
        >
          <Home size={16} /> Go to homepage
        </button>
      </div>
    </div>
  );
}
