import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, ArrowLeft, CheckCircle2 } from "lucide-react";
import { dataStore } from "../../components/services/dataStore";
import { SOCKET_EVENTS } from "../../components/services/socket";
import { notifyEvent } from "../../components/services/notifyEvent";
import { genId } from "../../components/utils/idGenerator";
import { sanitizeText, sanitizeEmail } from "../../components/utils/sanitize";
import { useToast } from "../../components/hooks/useToast";
import FormField from "../../components/shared/FormField";
import FileUpload from "../../components/shared/FileUpload";
import Button from "../../components/shared/Button";
import Footer from "../../components/Footer";
import logo from "../../assets/logo.jpeg";

const EMPTY_FORM = {
  name: "",
  employeeId: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  employmentType: "Company Employee",
  mealPlan: "Fixed Company Meal",
  mealBenefit: "Self Paid",
};

export default function Register() {
  const { push } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [docData, setDocData] = useState("");
  const [docName, setDocName] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const needsDocument = form.mealBenefit === "Complimentary";

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Full name is required.";
    if (!form.employeeId.trim()) nextErrors.employeeId = "Employee ID is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (!form.department.trim()) nextErrors.department = "Department is required.";
    if (needsDocument && !docData) {
      nextErrors.document = "A supporting document is required for a Complimentary meal benefit.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const request = {
      id: genId("AR"),
      name: sanitizeText(form.name, 100),
      employeeId: sanitizeText(form.employeeId, 30),
      email: sanitizeEmail(form.email),
      phone: sanitizeText(form.phone, 20),
      department: sanitizeText(form.department, 60),
      designation: sanitizeText(form.designation, 60),
      employmentType: form.employmentType,
      mealPlan: form.mealPlan,
      mealBenefit: form.mealBenefit,
      supportingDocument: needsDocument ? docData : "",
      supportingDocumentName: needsDocument ? docName : "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    try {
      await dataStore.insert("accountRequests", request);
      await notifyEvent(SOCKET_EVENTS.ACCOUNT_REQUEST_SUBMITTED, {
        message: `New account request from ${request.name} is waiting for review.`,
        recipientRoles: ["super_admin"],
      });
      setSubmitted(true);
      push("Registration submitted — a Super Admin will review it shortly.", "success");
    } catch {
      push("Could not submit your registration. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-ink-950 via-ink-900 to-brand-950 px-4 text-center">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
          <h1 className="mt-4 text-xl font-bold text-ink-900">Request Submitted</h1>
          <p className="mt-2 text-sm text-ink-500">
            Your registration has been sent to a Super Admin for approval. Once approved, your
            login credentials will be sent to <span className="font-semibold">{form.email}</span>.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-ink-950 via-ink-900 to-brand-950">
      <div className="relative flex flex-1 items-center justify-center px-4 py-10">
        <Link
          to="/login"
          className="absolute left-4 top-4 flex items-center gap-1 text-sm text-ink-300 hover:text-white sm:left-6 sm:top-6"
        >
          <ArrowLeft size={16} /> Back to login
        </Link>

        <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <img src={logo} alt="Conveyor Group" className="h-14 w-auto" />
            <h1 className="text-lg font-bold text-ink-900">Create an Account</h1>
            <p className="text-sm text-ink-500">
              Fill in your details — a Super Admin will review and approve your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full Name" error={errors.name} required>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
            <FormField label="Employee ID" error={errors.employeeId} required>
              <input
                value={form.employeeId}
                onChange={(e) => set("employeeId", e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
            <FormField label="Email" error={errors.email} required>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
            <FormField label="Phone">
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
            <FormField label="Department" error={errors.department} required>
              <input
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
            <FormField label="Designation">
              <input
                value={form.designation}
                onChange={(e) => set("designation", e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
            <FormField label="Employment Type">
              <select
                value={form.employmentType}
                onChange={(e) => set("employmentType", e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option>Company Employee</option>
                <option>External Client</option>
                <option>Contractor</option>
                <option>Temporary Employee</option>
              </select>
            </FormField>
            <FormField label="Meal Plan">
              <select
                value={form.mealPlan}
                onChange={(e) => set("mealPlan", e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option>Fixed Company Meal</option>
                <option>Custom Menu</option>
                <option>Complimentary Meal</option>
              </select>
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Meal Benefit" hint="Selecting Complimentary requires a supporting document below">
                <select
                  value={form.mealBenefit}
                  onChange={(e) => set("mealBenefit", e.target.value)}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option>Company Subsidized</option>
                  <option>Complimentary</option>
                  <option>Self Paid</option>
                </select>
              </FormField>
            </div>

            {needsDocument && (
              <div className="sm:col-span-2">
                <FileUpload
                  label="Supporting Document"
                  required
                  value={docData}
                  fileName={docName}
                  onChange={(data, name) => {
                    setDocData(data);
                    setDocName(name);
                  }}
                  error={errors.document}
                  hint="Upload proof supporting your Complimentary meal benefit (PDF or image, under 2MB)."
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" fullWidth loading={submitting} icon={UserPlus}>
                {submitting ? "Submitting..." : "Submit Registration"}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}