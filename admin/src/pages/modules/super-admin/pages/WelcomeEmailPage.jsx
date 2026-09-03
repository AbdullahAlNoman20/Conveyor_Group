import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Copy, Send, FileDown } from "lucide-react";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";
import logo from "../../../../assets/logo.jpeg";

export default function WelcomeEmailPage() {
  const { userId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { push } = useToast();
  const { name, email, password, role, qrToken } = location.state || {};
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!name) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
          <ArrowLeft size={16} /> Back
        </button>
        <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
          No credentials to display — navigate here from creating or approving an account.
        </p>
      </div>
    );
  }

  function copyCredentials() {
    navigator.clipboard?.writeText(`Login email: ${email}\nTemporary password: ${password}`);
    push("Credentials copied to clipboard.", "success");
  }

  function sendEmail() {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      push(`Welcome email sent to ${email}.`, "success");
      setTimeout(() => setSent(false), 1500);
    }, 900);
  }

  function downloadPDF() {
    printOnLetterhead({
      title: `Welcome — ${name}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Welcome to Conveyor Group Restaurant</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">Account credentials for ${name}</p>
        <div class="row"><span class="label">Name</span><span>${name}</span></div>
        <div class="row"><span class="label">Role</span><span>${role}</span></div>
        <div class="row"><span class="label">Login Email</span><span>${email}</span></div>
        <div class="row"><span class="label">Temporary Password</span><span>${password}</span></div>
        ${qrToken ? `<div class="row"><span class="label">Note</span><span>QR identity card is ready in the dashboard</span></div>` : ""}
      `,
    });
    push("Use the print dialog's 'Save as PDF' to download.", "info");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => navigate("/app/super-admin/clients")} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Back to Clients
      </button>

      <div>
        <h1 className="text-2xl font-bold text-ink-900">Welcome Email — Preview</h1>
        <p className="text-sm text-ink-400">No email server connected yet — Send is simulated; use Download PDF to hand credentials over another way.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-200">
        <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50 px-4 py-3">
          <Mail size={16} className="text-ink-400" />
          <div className="text-xs text-ink-500">
            <p>To: <span className="font-medium text-ink-800">{email}</span></p>
            <p>From: accounts@conveyorgroup.com</p>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <img src={logo} alt="Conveyor Group" className="h-8 w-auto" />
          <p className="text-sm text-ink-700">Hi {name},</p>
          <p className="text-sm text-ink-600">
            Your Conveyor Group Restaurant account is ready. You've been set up as <span className="font-semibold">{role}</span>.
            Use the credentials below to sign in — you'll be asked to set your own password on first login.
          </p>
          <div className="rounded-lg bg-ink-50 p-4 font-mono text-sm">
            <p>Login email: <span className="font-semibold">{email}</span></p>
            <p>Temporary password: <span className="font-semibold">{password}</span></p>
          </div>
          {qrToken && <p className="text-sm text-ink-600">Your QR identity card is ready in your dashboard under "My QR Card".</p>}
          <p className="text-xs text-ink-400">— Conveyor Group Restaurant</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" icon={Copy} onClick={copyCredentials}>Copy</Button>
        <Button variant="secondary" icon={FileDown} onClick={downloadPDF}>Download PDF</Button>
        <Button variant="primary" icon={Send} onClick={sendEmail} loading={sending} success={sent}>
          {sent ? "Sent" : "Send Email"}
        </Button>
      </div>
    </div>
  );
}