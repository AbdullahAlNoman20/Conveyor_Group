import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, UserPlus, Eye, FileText } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import {
  generatePassword,
  deriveEmail,
} from "../../../../components/utils/credentials";
import { useToast } from "../../../../components/hooks/useToast";
import Badge from "../../../../components/shared/Badge";
import Modal from "../../../../components/shared/Modal";
import Loader from "../../../../components/shared/Loader";
import Pagination, {
  usePagination,
} from "../../../../components/shared/Pagination";
import EmailPreviewModal from "../../../../components/shared/EmailPreviewModal";

export default function AccountRequests() {
  const { push } = useToast();
  const [requests, setRequests] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [emailPreview, setEmailPreview] = useState(null);

  useEffect(() => {
    (async () => setRequests(await dataStore.load("accountRequests", "account-requests.json")))();
  }, []);

  // usePagination must run on every render, in the same order — the early
  // "still loading" return has to come AFTER every hook call, so filter
  // against `requests || []` here instead of returning before these run.
  const pending = (requests || []).filter((r) => r.status === "pending");
  const decided = (requests || []).filter((r) => r.status !== "pending");
  const pendingPage = usePagination(pending, 6);
  const decidedPage = usePagination(decided, 8);

  if (!requests) return <Loader full label="Loading account requests..." />;

  // Mirrors SuperAdminClients' "new client" branch exactly — profile,
  // login account, and QR token are created together in one shot.
  async function approve(req) {
    const email = req.email || deriveEmail(req.name);
    const password = generatePassword();
    const clientId = genId("C");
    const userId = genId("U");

    const clientRecord = {
      id: clientId,
      userId,
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
      defaultPaymentMethod: "wallet",
      avatarColor: "#059669",
    };

    await dataStore.insert("clients", clientRecord);
    await dataStore.insert("users", userRecord);
    const nextRequests = await dataStore.update(
      "accountRequests",
      (r) => r.id === req.id,
      {
        status: "approved",
      },
    );
    setRequests(nextRequests);
    push(`${req.name}'s account approved and created.`, "success");
    setEmailPreview({
      name: req.name,
      email,
      password,
      role: `Client (${req.mealPlan})`,
      qrToken: clientId,
    });
  }

  async function reject(req) {
    const next = await dataStore.update(
      "accountRequests",
      (r) => r.id === req.id,
      {
        status: "rejected",
      },
    );
    setRequests(next);
    push(`${req.name}'s request rejected.`, "info");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Account Requests</h1>
        <p className="text-sm text-ink-400">
          Self-registrations submitted from the login page — review and approve
          to activate.
        </p>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
          <UserPlus size={16} /> Pending ({pending.length})
        </h2>
        <div className="space-y-3">
          {pendingPage.pageItems.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
            >
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {r.name}{" "}
                  <span className="font-normal text-ink-500">
                    · {r.employeeId}
                  </span>
                </p>
                <p className="text-xs text-ink-500">
                  {r.department} · {r.mealPlan} · {r.mealBenefit}
                  {r.supportingDocument && " · document attached"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewing(r)}
                  className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                >
                  <Eye size={14} /> View
                </button>
                <button
                  onClick={() => approve(r)}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
                <button
                  onClick={() => reject(r)}
                  className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>
            </div>
          ))}
          {pending.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-400">
              No pending requests.
            </p>
          )}
        </div>
        <Pagination
          page={pendingPage.page}
          totalPages={pendingPage.totalPages}
          onChange={pendingPage.setPage}
        />
      </div>

      {decided.length > 0 && (
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Decided</h2>
          <div className="space-y-2">
            {decidedPage.pageItems.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-ink-700">
                  {r.name} · {r.employeeId}
                </span>
                <Badge tone={r.status === "approved" ? "active" : "cancelled"}>
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
          <Pagination
            page={decidedPage.page}
            totalPages={decidedPage.totalPages}
            onChange={decidedPage.setPage}
          />
        </div>
      )}

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Request Details"
        size="sm"
      >
        {viewing && (
          <div className="space-y-2 text-sm">
            <Row label="Name" value={viewing.name} />
            <Row label="Employee ID" value={viewing.employeeId} />
            <Row label="Email" value={viewing.email} />
            <Row label="Phone" value={viewing.phone || "-"} />
            <Row label="Department" value={viewing.department} />
            <Row label="Designation" value={viewing.designation || "-"} />
            <Row label="Employment Type" value={viewing.employmentType} />
            <Row label="Meal Plan" value={viewing.mealPlan} />
            <Row label="Meal Benefit" value={viewing.mealBenefit} />
            {viewing.supportingDocument && (
              <div className="rounded-lg bg-ink-50 p-3">
                <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-ink-500">
                  <FileText size={13} /> Supporting Document
                </p>
                {viewing.supportingDocument.startsWith("data:image") ? (
                  <img
                    src={viewing.supportingDocument}
                    alt="Supporting document"
                    className="max-h-64 w-full rounded-lg object-contain"
                  />
                ) : (
                  <a
                    href={viewing.supportingDocument}
                    download={viewing.supportingDocumentName || "document"}
                    className="text-sm font-medium text-brand-600 underline"
                  >
                    {viewing.supportingDocumentName || "Download document"}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <EmailPreviewModal
        open={!!emailPreview}
        onClose={() => setEmailPreview(null)}
        {...(emailPreview || {})}
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between rounded-lg bg-ink-50 px-3 py-2">
      <span className="text-ink-500">{label}</span>
      <span className="font-medium text-ink-800">{value}</span>
    </div>
  );
}
