// FILE: src/components/shared/EmailPreviewModal.jsx  (MODIFIED, full rewrite)
import { useState } from "react";
import { Mail, CheckCircle2, Copy, Send } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { useToast } from "../hooks/useToast";
import { dataStore } from "../services/dataStore";
import { genId } from "../utils/idGenerator";
import logo from "../../assets/logo.jpeg";

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/**
 * No real email backend exists yet (design/testing phase — server team will
 * wire this to a real mailer later). This modal shows exactly what the
 * "Welcome" email would contain, and now has a real one-click "Send"
 * action: it simulates the network round-trip (loading -> success pulse on
 * the button, per the shared Button component's transaction-animation
 * convention) so the flow FEELS complete even without a live mail server.
 * Copy-to-clipboard stays as a fallback for manually handing over
 * credentials in the meantime.
 */
export default function EmailPreviewModal({ open, onClose, name, email, password, role, qrToken }) {
  const { push } = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function copyCredentials() {
    const text = `Login email: ${email}\nTemporary password: ${password}`;
    navigator.clipboard?.writeText(text);
    push("Credentials copied to clipboard.", "success");
  }

  async function archiveRegistrationEmail() {
    // Only the initial account-creation email (has a qrToken) is a
    // "registration" email — password resets are not archived here.
    if (!qrToken) return;
    const bodyHtml = `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Your Conveyor Group Restaurant account is ready. You've been set up as
      <strong>${escapeHtml(role)}</strong>. Use the credentials shared with you
      separately to sign in — you'll be asked to set your own password on
      first login.</p>
      ${qrToken ? `<p>Your QR identity card is ready in your dashboard under "My QR Card".</p>` : ""}
      <p style="color:#98999b;font-size:12px;">— Conveyor Group Restaurant</p>
    `;
    await dataStore.insert("registrationEmails", {
      id: genId("RE"),
      name: escapeHtml(name),
      email: escapeHtml(email),
      role: escapeHtml(role),
      qrToken: qrToken || null,
      bodyHtml,
      sentAt: new Date().toISOString(),
    });
  }

  function sendEmail() {
    setSending(true);
    // Simulated network round-trip — swap this timeout for a real API call
    // (e.g. POST /api/notifications/welcome-email) once a backend exists;
    // nothing else in this component needs to change.
    setTimeout(async () => {
      setSending(false);
      setSent(true);
      await archiveRegistrationEmail();
      push(`Welcome email sent to ${email}.`, "success");
      setTimeout(() => setSent(false), 1500);
    }, 900);
  }

  // Reset the send-state each time the modal is reopened for a new person.
  function handleClose() {
    setSending(false);
    setSent(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Welcome Email — Preview" size="md">
      <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">
        <CheckCircle2 size={16} />
        No email server is connected yet — "Send" is simulated until the backend team wires one up.
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

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" icon={Copy} onClick={copyCredentials} fullWidth>
          Copy Credentials
        </Button>
        <Button
          variant="primary"
          icon={Send}
          onClick={sendEmail}
          loading={sending}
          success={sent}
          fullWidth
        >
          {sent ? "Sent" : "Send Email"}
        </Button>
      </div>
    </Modal>
  );
}