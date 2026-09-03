import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { UserPlus, ArrowLeft, CheckCircle2, Camera, Image as ImageIcon } from "lucide-react";
import { dataStore } from "../../components/services/dataStore";
import { SOCKET_EVENTS } from "../../components/services/socket";
import { notifyEvent } from "../../components/services/notifyEvent";
import { playAlertSound } from "../../components/services/notify";
import { genId } from "../../components/utils/idGenerator";
import { sanitizeText, sanitizeEmail } from "../../components/utils/sanitize";
import { useToast } from "../../components/hooks/useToast";
import FormField from "../../components/shared/FormField";
import FileUpload from "../../components/shared/FileUpload";
import Button from "../../components/shared/Button";
import logo from "../../assets/logo.jpeg";

// Meal Plan is fixed to a single option for every self-registration — not
// a user choice anymore (SRS update: only "Fixed Company Meal" exists at
// registration time).
const FIXED_MEAL_PLAN = "Fixed Company Meal";
// Employment Type is no longer collected at registration; every
// self-registered account defaults to "Company Employee" internally.
const DEFAULT_EMPLOYMENT_TYPE = "Company Employee";

const EMPTY_FORM = {
  name: "",
  employeeId: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  mealBenefit: "Self Paid",
};

export default function Register() {
  const { push } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [docData, setDocData] = useState("");
  const [docName, setDocName] = useState("");
  const [photo, setPhoto] = useState("");
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
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
      photo: photo || "",
      name: sanitizeText(form.name, 100),
      employeeId: sanitizeText(form.employeeId, 30),
      email: sanitizeEmail(form.email),
      phone: sanitizeText(form.phone, 20),
      department: sanitizeText(form.department, 60),
      designation: sanitizeText(form.designation, 60),
      employmentType: DEFAULT_EMPLOYMENT_TYPE,
      mealPlan: FIXED_MEAL_PLAN,
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
      await notifyEvent(SOCKET_EVENTS.ACCOUNT_REQUEST_SUBMITTED, {
        message: `Thanks, ${request.name}! Your registration was submitted and is awaiting Super Admin approval.`,
        recipientNames: [request.name],
      });
      playAlertSound();
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
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink-950 px-4 text-center">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/videos/hero_bg.webm"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-ink-950/80" />
        <div className="relative max-w-md rounded-2xl bg-white p-8 shadow-2xl">
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-ink-950">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/videos/hero_bg.webm"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-ink-950/80" />

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

          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-ink-100 bg-ink-50">
              {photo ? (
                <img src={photo} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-300">
                  <Camera size={26} />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
              >
                <Camera size={13} /> Take Photo
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
              >
                <ImageIcon size={13} /> Choose from Gallery
              </button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setPhoto(reader.result);
                reader.readAsDataURL(file);
              }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setPhoto(reader.result);
                reader.readAsDataURL(file);
              }}
            />
          </div>

          <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
                        <FormField
              label="Full Name"
              error={errors.name}
              required
              info={{ instruction: "Enter your full legal name as it appears on your company ID.", example: "Md. Rafiqul Islam" }}
            >
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
            <FormField
              label="Employee ID"
              error={errors.employeeId}
              required
              info={{ instruction: "Your official employee ID issued by the company HR department.", example: "EMP-1042" }}
            >
              <input
                value={form.employeeId}
                onChange={(e) => set("employeeId", e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
            <FormField
              label="Email"
              error={errors.email}
              required
              info={{ instruction: "Use a working email address — your login credentials will be sent here once approved.", example: "rafiqul.islam@conveyorgroup.com" }}
            >
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
            <FormField
              label="Phone"
              info={{ instruction: "Your active mobile number for contact purposes.", example: "01712-345678" }}
            >
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
            <FormField
              label="Department"
              error={errors.department}
              required
              info={{ instruction: "The department you currently work in.", example: "Finance, Operations, IT" }}
            >
              <input
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
            <FormField
              label="Designation"
              info={{ instruction: "Your official job title/designation.", example: "Senior Accountant" }}
            >
              <input
                value={form.designation}
                onChange={(e) => set("designation", e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>

            <FormField label="Meal Plan">
              <div className="flex items-center rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-600">
                {FIXED_MEAL_PLAN}
              </div>
            </FormField>

            <div className="sm:col-span-2">
              <FormField
                label="Meal Benefit"
                hint="Default is Self Paid. Selecting Complimentary requires a supporting document below."
                info={{
                  instruction: "Self Paid means you pay for your own meals. Complimentary means the company provides your meals free — this requires a signed permission letter from the Chairman as proof.",
                  example: "Choose \"Self Paid\" unless your company has agreed to cover your meals.",
                }}
              >
                <select
                  value={form.mealBenefit}
                  onChange={(e) => set("mealBenefit", e.target.value)}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option>Self Paid</option>
                  <option>Complimentary</option>
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
                  hint="You must bring a written permission letter from the company Chairman stating that the company will provide you free meals, and upload it here. Management will verify it and activate your account as soon as possible."
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
    </div>
  );
}