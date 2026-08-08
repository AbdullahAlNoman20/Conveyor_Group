// FILE: src/components/shared/EmailPreviewModal.jsx  (NEW)
import { Mail, CheckCircle2, Copy } from "lucide-react";
import Modal from "./Modal";
import { useToast } from "../hooks/useToast";
import logo from "../../assets/logo.jpeg";

/**
 * No real email backend exists yet (design/testing phase). This modal shows
 * exactly what the "Welcome" email would contain, so Super Admin can confirm
 * the right credentials went out, and hands them a Copy button as the
 * practical stand-in for "sent to their inbox" until a mail server is wired
 * up — swap the onClose-time behavior for a real API call at that point,
 * the rest of the flow (credential generation, QR, role) doesn't change.
 */
export default function EmailPreviewModal({ open, onClose, name, email, password, role, qrToken }) {
  const { push } = useToast();

  function copyCredentials() {
    const text = `Login email: ${email}\nTemporary password: ${password}`;
    navigator.clipboard?.writeText(text);
    push("Credentials copied to clipboard.", "success");
  }

  return (
    <Modal open={open} onClose={onClose} title="Welcome Email — Preview" size="md">
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <CheckCircle2 size={16} />
        Simulated send — no email server connected yet in this design/testing phase.
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-ink-200">
        <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50 px-4 py-3">
          <Mail size={16} className="text-ink-400" />
          <div className="text-xs text-ink-500">
            <p>
              To: <span className="font-medium text-ink-800">{email}</span>
            </p>
            <p>From: accounts@conveyorgroup.com</p>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <img src={logo} alt="Conveyor Group" className="h-8 w-auto" />
          <p className="text-sm text-ink-700">Hi {name},</p>
          <p className="text-sm text-ink-600">
            Your Conveyor Group Restaurant account is ready. You've been set up as{" "}
            <span className="font-semibold">{role}</span>. Use the credentials below to sign in —
            you'll be asked to set your own password on first login.
          </p>
          <div className="rounded-lg bg-ink-50 p-4 font-mono text-sm">
            <p>
              Login email: <span className="font-semibold">{email}</span>
            </p>
            <p>
              Temporary password: <span className="font-semibold">{password}</span>
            </p>
          </div>
          {qrToken && (
            <p className="text-sm text-ink-600">
              Your QR identity card is ready in your dashboard under "My QR Card" — show it at the
              counter to order.
            </p>
          )}
          <p className="text-xs text-ink-400">— Conveyor Group Restaurant</p>
        </div>
      </div>

      <button
        onClick={copyCredentials}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        <Copy size={16} /> Copy Credentials
      </button>
    </Modal>
  );
}