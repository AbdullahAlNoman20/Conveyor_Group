import Modal from "./Modal";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="flex gap-3">
        <AlertTriangle className={danger ? "text-brand-600" : "text-amber-500"} size={22} />
        <p className="text-sm text-ink-600">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
            danger ? "bg-brand-600 hover:bg-brand-700" : "bg-ink-800 hover:bg-ink-900"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
