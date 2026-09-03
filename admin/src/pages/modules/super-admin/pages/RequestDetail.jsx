// FILE: src/pages/modules/super-admin/pages/RequestDetail.jsx (NEW)
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, FileText, Send } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { generatePassword, deriveEmail } from "../../../../components/utils/credentials";
import { SOCKET_EVENTS } from "../../../../components/services/socket";
import { notifyEvent } from "../../../../components/services/notifyEvent";
import { useToast } from "../../../../components/hooks/useToast";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Button from "../../../../components/shared/Button";
import Modal from "../../../../components/shared/Modal";
import EmailPreviewModal from "../../../../components/shared/EmailPreviewModal";

function Row({ label, value }) {
  return (
    <div className="flex justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
      <span className="text-ink-500">{label}</span>
      <span className="font-medium text-ink-800">{value || "-"}</span>
    </div>
  );
}

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();

  const [requests, setRequests] = useState(null);
  const [emailPreview, setEmailPreview] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => setRequests(await dataStore.load("accountRequests", "account-requests.json")))();
  }, []);

  if (!requests) return <Loader full label="Loading request..." />;

  const req = requests.find((r) => r.id === id);

  if (!req) {
    return (
      <div className="space-y-4">
        <Link
          to="/app/super-admin/account-requests"
          className="flex items-center gap-1 text-sm text-ink-500 hover:text-brand-600"
        >
          <ArrowLeft size={15} /> Back to Account Requests
        </Link>
        <p className="text-sm text-ink-400">
          Request not found — it may have already been decided or removed.
        </p>
      </div>
    );
  }

  // Mirrors the previous modal-based approve() exactly — profile, login
  // account (now including photo — see Task 6), and QR token created together.
  async function approve() {
    setBusy(true);
    const email = req.email || deriveEmail(req.name);
    const password = generatePassword();
    const clientId = genId("C");
    const userId = genId("U");

    const clientRecord = {
      id: clientId,
      userId,
      photo: req.photo || "",
      name: req.name,
      employeeId: req.employeeId,
      email,
      phone: req.phone,
      department: req.department,
      designation: req.designation,
      employmentType: req.employmentType,
      mealPlan: req.mealPlan,
      mealBenefit: req.mealBenefit,
      walletBalance: 0,
      monthlyBill: 0,
      qrStatus: "active",
      qrToken: genId("QR"),
      status: "active",
    };
    const userRecord = {
      id: userId,
      name: req.name,
      email,
      phone: req.phone,
      password,
      role: "client",
      status: "active",
      photo: req.photo || "",
      department: req.department,
      designation: req.designation,
      employeeId: req.employeeId,
      employmentType: req.employmentType,
      mealPlan: req.mealPlan,
      mealBenefit: req.mealBenefit,
      defaultPaymentMethod: "wallet",
      avatarColor: "#059669",
    };

    await dataStore.insert("clients", clientRecord);
    await dataStore.insert("users", userRecord);
    const nextRequests = await dataStore.update("accountRequests", (r) => r.id === req.id, {
      status: "approved",
    });
    setRequests(nextRequests);
    setBusy(false);
    push(`${req.name}'s account approved and created.`, "success");
    setEmailPreview({
      name: req.name,
      email,
      password,
      role: `Client (${req.mealPlan})`,
      qrToken: clientId,
    });
  }

  async function confirmReject() {
    if (!reason.trim()) {
      push("Please write a reason for rejection.", "error");
      return;
    }
    setBusy(true);
    const next = await dataStore.update("accountRequests", (r) => r.id === req.id, {
      status: "rejected",
      rejectionReason: reason.trim(),
    });
    setRequests(next);
    // No real mail server yet — logged as a notification so the applicant
    // sees the reason once they check back, same simulated pattern used
    // for the welcome email.
    await notifyEvent(SOCKET_EVENTS.ACCOUNT_REQUEST_SUBMITTED, {
      message: `Your registration request was rejected. Reason: ${reason.trim()}`,
      recipientNames: [req.name],
    });
    setBusy(false);
    setRejectOpen(false);
    push(`Rejection email sent to ${req.email || req.name}.`, "info");
    navigate("/app/super-admin/account-requests");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/app/super-admin/account-requests"
        className="flex items-center gap-1 text-sm text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft size={15} /> Back to Account Requests
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{req.name}</h1>
          <p className="text-sm text-ink-400">
            {req.employeeId} · {req.department}
          </p>
        </div>
        <Badge tone={req.status === "pending" ? "pending" : req.status === "approved" ? "active" : "cancelled"}>
          {req.status}
        </Badge>
      </div>

      <div className="space-y-2 rounded-xl border border-ink-100 bg-white p-5">
        <Row label="Full Name" value={req.name} />
        <Row label="Employee ID" value={req.employeeId} />
        <Row label="Email" value={req.email} />
        <Row label="Phone" value={req.phone} />
        <Row label="Department" value={req.department} />
        <Row label="Designation" value={req.designation} />
        <Row label="Employment Type" value={req.employmentType} />
        <Row label="Meal Plan" value={req.mealPlan} />
        <Row label="Meal Benefit" value={req.mealBenefit} />
        {req.status === "rejected" && req.rejectionReason && (
          <Row label="Rejection Reason" value={req.rejectionReason} />
        )}
      </div>

      {req.supportingDocument && (
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-ink-500">
            <FileText size={13} /> Supporting Document
          </p>
          {req.supportingDocument.startsWith("data:image") ? (
            <img
              src={req.supportingDocument}
              alt="Supporting document"
              className="max-h-80 w-full rounded-lg object-contain"
            />
          ) : (
            <a
              href={req.supportingDocument}
              download={req.supportingDocumentName || "document"}
              className="text-sm font-medium text-brand-600 underline"
            >
              {req.supportingDocumentName || "Download document"}
            </a>
          )}
        </div>
      )}

      {req.status === "pending" && (
        <div className="flex gap-3">
          <Button variant="primary" icon={CheckCircle2} loading={busy} onClick={approve} fullWidth>
            Approve
          </Button>
          <Button variant="danger" icon={XCircle} onClick={() => setRejectOpen(true)} fullWidth>
            Reject
          </Button>
        </div>
      )}

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Request" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-500">
            This reason will be emailed to {req.name} explaining why their request was rejected.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="e.g. Employee ID could not be verified against HR records."
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <Button variant="danger" icon={Send} loading={busy} onClick={confirmReject} fullWidth>
            Send Rejection Email
          </Button>
        </div>
      </Modal>

      <EmailPreviewModal
        open={!!emailPreview}
        onClose={() => {
          setEmailPreview(null);
          navigate("/app/super-admin/account-requests");
        }}
        {...(emailPreview || {})}
      />
    </div>
  );
}