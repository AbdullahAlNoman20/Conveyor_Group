// admin/src/pages/modules/super-admin/pages/AccountRequestDetail.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, FileText, Send } from "lucide-react";
import { apiGet, apiPost } from "../../../../components/services/api";
import { useToast } from "../../../../components/hooks/useToast";
import AvatarImage from "../../../../components/shared/AvatarImage";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Modal from "../../../../components/shared/Modal";
import Button from "../../../../components/shared/Button";

export default function AccountRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();

  const [req, setReq] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiGet(`/account-requests/${id}`)
      .then((data) => mounted && setReq(data))
      .catch(() => mounted && setNotFound(true));
    return () => {
      mounted = false;
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/app/super-admin/account-requests")}
          className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
          Request not found — it may have already been decided or removed.
        </p>
      </div>
    );
  }

  if (!req) return <Loader full label="Loading request..." />;

  // The whole approval (client row + login row + QR token + notification)
  // happens in ONE server transaction. The old version did four separate
  // client-side writes and could leave a half-created account behind.
  async function approve() {
    setBusy(true);
    try {
      const { credentials } = await apiPost(`/account-requests/${req.id}/approve`);
      push(`${req.name}'s account approved.`, "success");
      navigate(`/app/super-admin/welcome-email/${credentials.userId}`, {
        state: credentials,
      });
    } catch (err) {
      push(err?.message || "Could not approve this request.", "error");
      setBusy(false);
    }
  }

  async function confirmReject() {
    if (!reason.trim()) {
      push("Please write a reason for rejection.", "error");
      return;
    }
    setBusy(true);
    try {
      await apiPost(`/account-requests/${req.id}/reject`, { reason: reason.trim() });
      push(`${req.name}'s request rejected.`, "info");
      navigate("/app/super-admin/account-requests");
    } catch (err) {
      push(err?.message || "Could not reject this request.", "error");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/app/super-admin/account-requests")}
        className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft size={16} /> Back to Requests
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AvatarImage name={req.name} photo={req.photo} size={56} className="shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-ink-900">{req.name}</h1>
            <p className="text-sm text-ink-400">{req.employeeId}</p>
          </div>
        </div>
        <Badge
          tone={
            req.status === "pending"
              ? "pending"
              : req.status === "approved"
                ? "active"
                : "cancelled"
          }
        >
          {req.status}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Email" value={req.email} />
        <Row label="Phone" value={req.phone || "-"} />
        <Row label="Department" value={req.department} />
        <Row label="Designation" value={req.designation || "-"} />
        <Row label="Employment Type" value={req.employmentType} />
        <Row label="Meal Plan" value={req.mealPlan} />
        <Row label="Meal Benefit" value={req.mealBenefit} />
        <Row label="Submitted" value={new Date(req.createdAt).toLocaleString()} />
        {req.status === "rejected" && req.rejectionReason && (
          <div className="sm:col-span-2">
            <Row label="Rejection Reason" value={req.rejectionReason} />
          </div>
        )}
      </div>

      {req.supportingDocument && (
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <p className="mb-2 flex items-center gap-1 text-sm font-bold text-ink-700">
            <FileText size={15} /> Supporting Document
          </p>

            href={req.supportingDocument}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm font-medium text-brand-600 underline"
          >
            {req.supportingDocumentName || "Open document"}
          </a>
          <img
            src={req.supportingDocument}
            alt="Supporting document"
            className="mt-3 max-h-96 w-full rounded-lg object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}

      {req.status === "pending" && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="primary" icon={CheckCircle2} loading={busy} onClick={approve} fullWidth>
            Approve & Create Account
          </Button>
          <Button
            variant="danger"
            icon={XCircle}
            disabled={busy}
            onClick={() => setRejectOpen(true)}
            fullWidth
          >
            Reject
          </Button>
        </div>
      )}

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Request"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-500">
            This reason is recorded on the request and shown to {req.name}.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={300}
            placeholder="e.g. Employee ID could not be verified against HR records."
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <Button variant="danger" icon={Send} loading={busy} onClick={confirmReject} fullWidth>
            Confirm Rejection
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="rounded-lg bg-ink-50 px-3 py-2.5">
      <p className="text-[11px] text-ink-400">{label}</p>
      <p className="break-words text-sm font-medium text-ink-800">{value}</p>
    </div>
  );
}