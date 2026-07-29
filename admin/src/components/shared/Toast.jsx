import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const STYLES = {
  success: { bg: "bg-emerald-600", Icon: CheckCircle2 },
  error: { bg: "bg-brand-600", Icon: XCircle },
  info: { bg: "bg-ink-800", Icon: Info },
};

export default function Toast({ type = "info", children, onClose }) {
  const { bg, Icon } = STYLES[type] || STYLES.info;
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-lg ${bg} px-4 py-3 text-sm text-white shadow-lg animate-[fadeIn_.15s_ease-out]`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1">{children}</p>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="shrink-0 opacity-80 hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
}
