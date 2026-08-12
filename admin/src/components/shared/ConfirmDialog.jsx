// FILE: src/components/shared/ConfirmDialog.jsx  (MODIFIED, full rewrite)
import Modal from "./Modal";
import Button from "./Button";
import { AlertTriangle } from "lucide-react";

/**
 * `busy` (NEW): pass true while the confirmed action is actually running
 * (an async dataStore call, etc.) so the Confirm button shows the shared
 * loading-spinner -> success-pulse transaction animation instead of just
 * closing instantly. Every caller that awaits something inside onConfirm
 * should track this in its own state and pass it through — see
 * StaffManagement.jsx / SuperAdminClients.jsx for the pattern.
 */
export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  danger = false,
  busy = false,
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
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}