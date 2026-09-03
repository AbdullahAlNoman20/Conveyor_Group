import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, FileText } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { generatePassword, deriveEmail } from "../../../../components/utils/credentials";
import { SOCKET_EVENTS } from "../../../../components/services/socket";
import { notifyEvent } from "../../../../components/services/notifyEvent";
import { useToast } from "../../../../components/hooks/useToast";
import AvatarImage from "../../../../components/shared/AvatarImage";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";

export default function AccountRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const [requests, setRequests] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => setRequests(await dataStore.load("accountRequests", "account-requests.json")))();
  }, []);

  if (!requests) return <Loader full label="Loading request..." />;
  const req = requests.find((r) => r.id === id);

  if (!req) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate("/app/super-admin/account-requests")} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
          <ArrowLeft size={16} /> Back
        </button>
        <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">Request not found.</p>
      </div>
    );
  }

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
      department: req.department,
      designation: req.designation,
      employeeId: req.employeeId,
      employmentType: req.employmentType,
      mealPlan: req.mealPlan,
      mealBenefit: req.mealBenefit,
      defaultPaymentMethod: "salary",
      avatarColor: "#059669",
    };

    await dataStore.insert("clients", clientRecord);
    await dataStore.insert("users", userRecord);
    await dataStore.update("accountRequests", (r) => r.id === req.id, { status: "approved" });
    await notifyEvent(SOCKET_EVENTS.ACCOUNT_REQUEST_SUBMITTED, {
      message: `Your account has been approved! Check your email for login details.`,
      recipientNames: [req.name],
    });
    setBusy(false);
    push(`${req.name}'s account approved.`, "success");
    navigate(`/app/super-admin/welcome-email/${userId}`, {
      state: { name: req.name, email, password, role: `Client (${req.mealPlan})`, qrToken: clientId },
    });
  }

  async function reject() {
    setBusy(true);
    await dataStore.update("accountRequests", (r) => r.id === req.id, { status: "rejected" });
    await notifyEvent(SOCKET_EVENTS.ACCOUNT_REQUEST_SUBMITTED, {
      message: `Your account request was not approved. Please contact the Super Admin for details.`,
      recipientNames: [req.name],
    });
    setBusy(false);
    push(`${req.name}'s request rejected.`, "info");
    navigate("/app/super-admin/account-requests");
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/app/super-admin/account-requests")} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Back to Requests
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AvatarImage name={req.name} size={56} />
          <div>
            <h1 className="text-2xl font-bold text-ink-900">{req.name}</h1>
            <p className="text-sm text-ink-400">{req.employeeId}</p>
          </div>
        </div>
        <Badge tone={req.status === "pending" ? "pending" : req.status === "approved" ? "active" : "cancelled"}>{req.status}</Badge>
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
      </div>

      {req.supportingDocument && (
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <p className="mb-2 flex items-center gap-1 text-sm font-bold text-ink-700">
            <FileText size={15} /> Supporting Document
          </p>
          {req.supportingDocument.startsWith("data:image") ? (
            <img src={req.supportingDocument} alt="Supporting document" className="max-h-96 w-full rounded-lg object-contain" />
          ) : (
            <a href={req.supportingDocument} download={req.supportingDocumentName || "document"} className="text-sm font-medium text-brand-600 underline">
              {req.supportingDocumentName || "Download document"}
            </a>
          )}
        </div>
      )}

      {req.status === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={approve}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 size={16} /> {busy ? "Processing..." : "Approve & Create Account"}
          </button>
          <button
            onClick={reject}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <XCircle size={16} /> {busy ? "Processing..." : "Reject"}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="rounded-lg bg-ink-50 px-3 py-2.5">
      <p className="text-[11px] text-ink-400">{label}</p>
      <p className="text-sm font-medium text-ink-800">{value}</p>
    </div>
  );
}