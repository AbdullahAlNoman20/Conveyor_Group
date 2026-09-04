import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  Camera,
  Image as ImageIcon,
} from "lucide-react";

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

const FIXED_MEAL_PLAN = "Fixed Company Meal";
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
    setForm((f) => ({
      ...f,
      [field]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Full name is required.";
    }

    if (!form.employeeId.trim()) {
      nextErrors.employeeId = "Employee ID is required.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    }

    if (!form.department.trim()) {
      nextErrors.department = "Department is required.";
    }

    if (needsDocument && !docData) {
      nextErrors.document =
        "A supporting document is required for a Complimentary meal benefit.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

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

      push(
        "Registration submitted — a Super Admin will review it shortly.",
        "success",
      );
    } catch {
      push("Could not submit your registration. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  /* ================= SUCCESS SCREEN ================= */

  if (submitted) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-ink-950 px-3 py-8 text-center sm:px-5">
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

        <div
          className="
            relative
            w-full max-w-md
            rounded-2xl
            bg-white
            p-5
            shadow-2xl
            sm:p-8
          "
        >
          <CheckCircle2 size={40} className="mx-auto text-emerald-600" />

          <h1 className="mt-4 text-lg font-bold text-ink-900 sm:text-xl">
            Request Submitted
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-ink-500 sm:text-sm">
            Your registration has been sent to a Super Admin for approval. Once
            approved, your login credentials will be sent to{" "}
            <span className="break-all font-semibold">{form.email}</span>.
          </p>

          <Link
            to="/login"
            className="
              mt-6
              inline-flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-lg
              bg-brand-600
              px-5 py-3
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-brand-700
              sm:w-auto
            "
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  /* ================= REGISTER PAGE ================= */

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-ink-950">
      {/* Background Video */}
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

      {/* Overlay */}
      <div className="absolute inset-0 bg-ink-950/80" />

      {/* Main */}
      <div
        className="
          relative
          flex flex-1
          items-center
          justify-center
          px-3
          py-16
          sm:px-5
          sm:py-10
        "
      >
        {/* Back */}
        <Link
          to="/login"
          className="
            absolute left-3 top-4
            inline-flex items-center gap-1
            rounded-lg
            px-2 py-1
            text-xs text-ink-300
            transition-colors hover:text-white
            sm:left-6 sm:top-6 sm:text-sm
          "
        >
          <ArrowLeft size={15} />
          <span>Back to login</span>
        </Link>

        {/* Main Card */}
        <div
          className="
            w-full
            max-w-3xl
            min-w-0
            rounded-2xl
            bg-white
            p-4
            shadow-2xl
            sm:p-6
            lg:p-8
          "
        >
          {/* Header */}
          <div className="mb-5 flex flex-col items-center gap-2 text-center sm:mb-6">
            <img
              src={logo}
              alt="Conveyor Group"
              className="h-12 w-auto sm:h-14"
            />

            <h1 className="text-lg font-bold text-ink-900 sm:text-xl">
              Create an Account
            </h1>

            <p className="max-w-xl text-xs leading-relaxed text-ink-500 sm:text-sm">
              Fill in your details — a Super Admin will review and approve your
              account.
            </p>
          </div>

          {/* ================= PHOTO ================= */}
          <div className="mb-6 flex flex-col items-center gap-3">
            {/* Preview */}
            <div
              className="
                h-20 w-20
                overflow-hidden
                rounded-full
                border-2
                border-ink-100
                bg-ink-50
                sm:h-24 sm:w-24
              "
            >
              {photo ? (
                <img
                  src={photo}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-300">
                  <Camera size={26} />
                </div>
              )}
            </div>

            {/* Photo Buttons */}
            <div
              className="
                flex w-full
                flex-col
                gap-2
                xs:flex-row
                sm:w-auto
                sm:flex-row
              "
            >
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="
                  inline-flex
                  w-full
                  items-center
                  justify-center
                  gap-1.5
                  rounded-lg
                  border border-ink-200
                  px-3 py-2
                  text-xs
                  font-semibold
                  text-ink-700
                  transition
                  hover:bg-ink-50
                  sm:w-auto
                "
              >
                <Camera size={13} />
                Take Photo
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="
                  inline-flex
                  w-full
                  items-center
                  justify-center
                  gap-1.5
                  rounded-lg
                  border border-ink-200
                  px-3 py-2
                  text-xs
                  font-semibold
                  text-ink-700
                  transition
                  hover:bg-ink-50
                  sm:w-auto
                "
              >
                <ImageIcon size={13} />
                Choose from Gallery
              </button>
            </div>

            {/* Camera */}
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

            {/* Gallery */}
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

          {/* ================= FORM ================= */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
            "
          >
            {/* Full Name */}
            <FormField
              label="Full Name"
              error={errors.name}
              required
              info={{
                instruction:
                  "Enter your full legal name as it appears on your company ID.",
                example: "Md. Rafiqul Islam",
              }}
            >
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="
                  w-full min-w-0
                  rounded-lg
                  border border-ink-200
                  px-3 py-2.5
                  text-sm
                  outline-none
                  transition
                  
                  
                  focus:ring-brand-100
                "
              />
            </FormField>

            {/* Employee ID */}
            <FormField
              label="Employee ID"
              error={errors.employeeId}
              required
              info={{
                instruction:
                  "Your official employee ID issued by the company HR department.",
                example: "EMP-1042",
              }}
            >
              <input
                value={form.employeeId}
                onChange={(e) => set("employeeId", e.target.value)}
                className="
                  w-full min-w-0
                  rounded-lg
                  border border-ink-200
                  px-3 py-2.5
                  text-sm
                  outline-none
                  transition
                  
                  
                  focus:ring-brand-100
                "
              />
            </FormField>

            {/* Email */}
            <FormField
              label="Email"
              error={errors.email}
              required
              info={{
                instruction:
                  "Use a working email address — your login credentials will be sent here once approved.",
                example: "rafiqul.islam@conveyorgroup.com",
              }}
            >
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="
                  w-full min-w-0
                  rounded-lg
                  border border-ink-200
                  px-3 py-2.5
                  text-sm
                  outline-none
                  transition
                  
                  
                  focus:ring-brand-100
                "
              />
            </FormField>

            {/* Phone */}
            <FormField
              label="Phone"
              info={{
                instruction: "Your active mobile number for contact purposes.",
                example: "01712-345678",
              }}
            >
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="
                  w-full min-w-0
                  rounded-lg
                  border border-ink-200
                  px-3 py-2.5
                  text-sm
                  outline-none
                  transition
                  
                  
                  focus:ring-brand-100
                "
              />
            </FormField>

            {/* Department */}
            <FormField
              label="Department"
              error={errors.department}
              required
              info={{
                instruction: "The department you currently work in.",
                example: "Finance, Operations, IT",
              }}
            >
              <input
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                className="
                  w-full min-w-0
                  rounded-lg
                  border border-ink-200
                  px-3 py-2.5
                  text-sm
                  outline-none
                  transition
                  
                  
                  focus:ring-brand-100
                "
              />
            </FormField>

            {/* Designation */}
            <FormField
              label="Designation"
              info={{
                instruction: "Your official job title/designation.",
                example: "Senior Accountant",
              }}
            >
              <input
                value={form.designation}
                onChange={(e) => set("designation", e.target.value)}
                className="
                  w-full min-w-0
                  rounded-lg
                  border border-ink-200
                  px-3 py-2.5
                  text-sm
                  outline-none
                  transition
                  
                  
                  focus:ring-brand-100
                "
              />
            </FormField>

            {/* Meal Plan */}
            <FormField label="Meal Plan">
              <div
                className="
                  flex min-h-[42px]
                  w-full min-w-0
                  items-center
                  rounded-lg
                  border border-ink-200
                  bg-ink-50
                  px-3 py-2.5
                  text-sm
                  text-ink-600
                "
              >
                <span className="truncate">{FIXED_MEAL_PLAN}</span>
              </div>
            </FormField>

            {/* Meal Benefit */}
            <div className="sm:col-span-2">
              <FormField
                label="Meal Benefit"
                hint="Default is Self Paid. Selecting Complimentary requires a supporting document below."
                info={{
                  instruction:
                    "Self Paid means you pay for your own meals. Complimentary means the company provides your meals free — this requires a signed permission letter from the Chairman as proof.",
                  example:
                    'Choose "Self Paid" unless your company has agreed to cover your meals.',
                }}
              >
                <select
                  value={form.mealBenefit}
                  onChange={(e) => set("mealBenefit", e.target.value)}
                  className="
                    w-full min-w-0
                    rounded-lg
                    border border-ink-200
                    bg-white
                    px-3 py-2.5
                    text-sm
                    outline-none
                    transition
                    
                    
                    focus:ring-brand-100
                  "
                >
                  <option>Self Paid</option>
                  <option>Complimentary</option>
                </select>
              </FormField>
            </div>

            {/* Supporting Document */}
            {needsDocument && (
              <div className="min-w-0 sm:col-span-2">
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

            {/* Submit */}
            <div className="min-w-0 sm:col-span-2">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={submitting}
                icon={UserPlus}
              >
                {submitting ? "Submitting..." : "Submit Registration"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
