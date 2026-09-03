import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, Camera, Image as ImageIcon } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText, sanitizeEmail } from "../../../../components/utils/sanitize";
import { generatePassword, deriveEmail } from "../../../../components/utils/credentials";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import FileUpload from "../../../../components/shared/FileUpload";
import Button from "../../../../components/shared/Button";

const FIXED_MEAL_PLAN = "Fixed Company Meal";
const DEFAULT_EMPLOYMENT_TYPE = "Company Employee";
const EMPTY_FORM = { name: "", employeeId: "", email: "", phone: "", department: "", designation: "", mealBenefit: "Self Paid" };

export default function CreateClient() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState("");
  const [docData, setDocData] = useState("");
  const [docName, setDocName] = useState("");
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const needsDocument = form.mealBenefit === "Complimentary";

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  }

  async function submit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Full name is required.";
    if (!form.employeeId.trim()) nextErrors.employeeId = "Employee ID is required.";
    if (!form.department.trim()) nextErrors.department = "Department is required.";
    if (needsDocument && !docData) nextErrors.document = "A supporting document is required for Complimentary meal benefit.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    const cleanName = sanitizeText(form.name, 100);
    const email = form.email ? sanitizeEmail(form.email) : deriveEmail(cleanName);
    const password = generatePassword();
    const clientId = genId("C");
    const userId = genId("U");

    const clientRecord = {
      id: clientId,
      userId,
      photo: photo || "",
      name: cleanName,
      employeeId: sanitizeText(form.employeeId, 30),
      email,
      phone: sanitizeText(form.phone, 20),
      department: sanitizeText(form.department, 60),
      designation: sanitizeText(form.designation, 60),
      employmentType: DEFAULT_EMPLOYMENT_TYPE,
      mealPlan: FIXED_MEAL_PLAN,
      mealBenefit: form.mealBenefit,
      supportingDocument: needsDocument ? docData : "",
      walletBalance: 0,
      monthlyBill: 0,
      qrStatus: "active",
      qrToken: genId("QR"),
      status: "active",
    };
    const userRecord = {
      id: userId,
      name: cleanName,
      email,
      phone: clientRecord.phone,
      password,
      role: "client",
      status: "active",
      department: clientRecord.department,
      designation: clientRecord.designation,
      employeeId: clientRecord.employeeId,
      employmentType: DEFAULT_EMPLOYMENT_TYPE,
      mealPlan: FIXED_MEAL_PLAN,
      mealBenefit: form.mealBenefit,
      defaultPaymentMethod: "salary",
      avatarColor: "#059669",
    };

    await dataStore.insert("clients", clientRecord);
    await dataStore.insert("users", userRecord);
    setSaving(false);
    push(`${cleanName} created — login account ready.`, "success");
    navigate(`/app/super-admin/welcome-email/${userId}`, {
      state: { name: cleanName, email, password, role: `Client (${FIXED_MEAL_PLAN})`, qrToken: clientId },
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => navigate("/app/super-admin/clients")} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Back to Clients
      </button>

      <div>
        <h1 className="text-2xl font-bold text-ink-900">Create Client</h1>
        <p className="text-sm text-ink-400">Profile and login account are created immediately — no approval step.</p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-ink-100 bg-ink-50">
          {photo ? (
            <img src={photo} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-300">
              <Camera size={26} />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50">
            <Camera size={13} /> Take Photo
          </button>
          <button type="button" onClick={() => galleryInputRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50">
            <ImageIcon size={13} /> Choose from Gallery
          </button>
        </div>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhoto} />
        <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </div>

      <form onSubmit={submit} className="grid gap-4 rounded-xl border border-ink-100 bg-white p-6 sm:grid-cols-2">
        <FormField label="Full Name" error={errors.name} required>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </FormField>
        <FormField label="Employee ID" error={errors.employeeId} required>
          <input value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </FormField>
        <FormField label="Email" hint="Leave blank to auto-generate">
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </FormField>
        <FormField label="Phone">
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </FormField>
        <FormField label="Department" error={errors.department} required>
          <input value={form.department} onChange={(e) => set("department", e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </FormField>
        <FormField label="Designation">
          <input value={form.designation} onChange={(e) => set("designation", e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </FormField>
        <FormField label="Meal Plan">
          <div className="flex items-center rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-600">{FIXED_MEAL_PLAN}</div>
        </FormField>
        <FormField label="Meal Benefit" hint="Complimentary requires a supporting document">
          <select value={form.mealBenefit} onChange={(e) => set("mealBenefit", e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100">
            <option>Self Paid</option>
            <option>Complimentary</option>
          </select>
        </FormField>

        {needsDocument && (
          <div className="sm:col-span-2">
            <FileUpload
              label="Supporting Document"
              required
              value={docData}
              fileName={docName}
              onChange={(data, name) => { setDocData(data); setDocName(name); }}
              error={errors.document}
              hint="Permission letter from the Chairman for Complimentary meal benefit."
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" fullWidth loading={saving} icon={UserPlus}>
            {saving ? "Creating..." : "Create Client"}
          </Button>
        </div>
      </form>
    </div>
  );
}