import { useEffect, useState } from "react";
import { UserPlus, QrCode, Clock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText } from "../../../../components/utils/sanitize";
import { validatePhone } from "../../../../components/utils/validators";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";

const TABS = [
  { key: "temporary", label: "Temporary Guest" },
  { key: "walk_in", label: "Walk-in Guest" },
  { key: "corporate", label: "Corporate Guest" },
];

const VALIDITY_OPTIONS = ["1 Hour", "3 Hours", "6 Hours", "12 Hours", "24 Hours", "Custom Expiry"];

export default function GuestManagement() {
  const { push } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState("temporary");
  const [guests, setGuests] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);

  useEffect(() => {
    (async () => setGuests(await dataStore.load("guests", "guests.json")))();
  }, []);

  // --- Temporary Guest state ---
  const [tempForm, setTempForm] = useState({ name: "", mobile: "", organization: "", purpose: "", validity: "6 Hours" });
  const [tempErrors, setTempErrors] = useState({});

  // --- Walk-in Guest state ---
  const [walkInForm, setWalkInForm] = useState({ name: "", tableNumber: "" });
  const [walkInErrors, setWalkInErrors] = useState({});

  // --- Corporate Guest state ---
  const [corpForm, setCorpForm] = useState({ name: "", company: "", department: "", purpose: "", billTo: "Company" });
  const [corpErrors, setCorpErrors] = useState({});

  async function submitTemporary(e) {
    e.preventDefault();
    const errs = {};
    if (!tempForm.name.trim()) errs.name = "Guest name is required.";
    if (!tempForm.mobile.trim() || !validatePhone(tempForm.mobile)) errs.mobile = "Enter a valid mobile number.";
    if (!tempForm.organization.trim()) errs.organization = "Organization is required.";
    if (!tempForm.purpose.trim()) errs.purpose = "Purpose is required.";
    setTempErrors(errs);
    if (Object.keys(errs).length) return;

    const guestId = genId("G");
    const record = {
      id: guestId,
      name: sanitizeText(tempForm.name, 80),
      type: "Temporary Guest",
      mobile: sanitizeText(tempForm.mobile, 20),
      organization: sanitizeText(tempForm.organization, 80),
      purpose: sanitizeText(tempForm.purpose, 150),
      validity: tempForm.validity,
      status: "active",
      qrToken: genId("QR"),
      generatedAt: new Date().toISOString(),
    };
    const next = await dataStore.insert("guests", record);
    setGuests(next);
    setLastGenerated(record);
    setTempForm({ name: "", mobile: "", organization: "", purpose: "", validity: "6 Hours" });
    push(`Temporary guest ${record.name} created with QR ${record.qrToken}.`, "success");
  }

  async function submitWalkIn(e) {
    e.preventDefault();
    const errs = {};
    if (!walkInForm.name.trim()) errs.name = "Guest name is required.";
    if (!walkInForm.tableNumber) errs.tableNumber = "Table number is required.";
    setWalkInErrors(errs);
    if (Object.keys(errs).length) return;

    const record = {
      id: genId("G"),
      name: sanitizeText(walkInForm.name, 80),
      type: "Walk-in Guest",
      tableNumber: Number(walkInForm.tableNumber),
      status: "active",
      generatedAt: new Date().toISOString(),
    };
    const next = await dataStore.insert("guests", record);
    setGuests(next);
    setLastGenerated(null);
    setWalkInForm({ name: "", tableNumber: "" });
    push(`Walk-in guest ${record.name} added to Table ${record.tableNumber}. No QR required.`, "success");
  }

  async function submitCorporate(e) {
    e.preventDefault();
    const errs = {};
    if (!corpForm.name.trim()) errs.name = "Guest name is required.";
    if (!corpForm.company.trim()) errs.company = "Company name is required.";
    if (!corpForm.department.trim()) errs.department = "Department is required.";
    if (!corpForm.purpose.trim()) errs.purpose = "Purpose is required.";
    setCorpErrors(errs);
    if (Object.keys(errs).length) return;

    const record = {
      id: genId("G"),
      name: sanitizeText(corpForm.name, 80),
      type: "Corporate Guest",
      company: sanitizeText(corpForm.company, 80),
      department: sanitizeText(corpForm.department, 80),
      purpose: sanitizeText(corpForm.purpose, 150),
      billTo: corpForm.billTo,
      status: "active",
      generatedAt: new Date().toISOString(),
    };
    const next = await dataStore.insert("guests", record);
    setGuests(next);
    setLastGenerated(null);
    setCorpForm({ name: "", company: "", department: "", purpose: "", billTo: "Company" });
    push(`Corporate guest ${record.name} added, billed to ${record.billTo}.`, "success");
  }

  if (!guests) return <Loader full label="Loading guests..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Guest Management</h1>
        <p className="text-sm text-ink-400">Create Temporary, Walk-in, or Corporate guest accounts.</p>
      </div>

      <div className="flex gap-2 rounded-xl bg-ink-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === t.key ? "bg-white text-brand-600 shadow-sm" : "text-ink-500 hover:text-ink-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-ink-100 bg-white p-5 lg:col-span-2">
          {tab === "temporary" && (
            <form onSubmit={submitTemporary} className="space-y-4">
              <h2 className="text-sm font-bold text-ink-700">Temporary Guest Form</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Guest Name" error={tempErrors.name} required>
                  <input
                    value={tempForm.name}
                    onChange={(e) => setTempForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </FormField>
                <FormField label="Mobile Number" error={tempErrors.mobile} required>
                  <input
                    value={tempForm.mobile}
                    onChange={(e) => setTempForm((f) => ({ ...f, mobile: e.target.value }))}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </FormField>
                <FormField label="Organization" error={tempErrors.organization} required>
                  <input
                    value={tempForm.organization}
                    onChange={(e) => setTempForm((f) => ({ ...f, organization: e.target.value }))}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </FormField>
                <FormField label="Validity Period" required>
                  <select
                    value={tempForm.validity}
                    onChange={(e) => setTempForm((f) => ({ ...f, validity: e.target.value }))}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  >
                    {VALIDITY_OPTIONS.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </FormField>
              </div>
              <FormField label="Purpose" error={tempErrors.purpose} required>
                <input
                  value={tempForm.purpose}
                  onChange={(e) => setTempForm((f) => ({ ...f, purpose: e.target.value }))}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </FormField>
              <button className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                Generate Guest ID & QR
              </button>
            </form>
          )}

          {tab === "walk_in" && (
            <form onSubmit={submitWalkIn} className="space-y-4">
              <h2 className="text-sm font-bold text-ink-700">Walk-in Guest Form</h2>
              <p className="text-xs text-ink-400">No QR code is required for a walk-in guest.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Guest Name" error={walkInErrors.name} required>
                  <input
                    value={walkInForm.name}
                    onChange={(e) => setWalkInForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </FormField>
                <FormField label="Table Number" error={walkInErrors.tableNumber} required>
                  <input
                    type="number"
                    value={walkInForm.tableNumber}
                    onChange={(e) => setWalkInForm((f) => ({ ...f, tableNumber: e.target.value }))}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </FormField>
              </div>
              <button className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                Add Walk-in Guest
              </button>
            </form>
          )}

          {tab === "corporate" && (
            <form onSubmit={submitCorporate} className="space-y-4">
              <h2 className="text-sm font-bold text-ink-700">Corporate Guest Form</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Guest Name" error={corpErrors.name} required>
                  <input
                    value={corpForm.name}
                    onChange={(e) => setCorpForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </FormField>
                <FormField label="Company Name" error={corpErrors.company} required>
                  <input
                    value={corpForm.company}
                    onChange={(e) => setCorpForm((f) => ({ ...f, company: e.target.value }))}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </FormField>
                <FormField label="Department" error={corpErrors.department} required>
                  <input
                    value={corpForm.department}
                    onChange={(e) => setCorpForm((f) => ({ ...f, department: e.target.value }))}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </FormField>
                <FormField label="Bill To" required>
                  <select
                    value={corpForm.billTo}
                    onChange={(e) => setCorpForm((f) => ({ ...f, billTo: e.target.value }))}
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  >
                    <option>Company</option>
                    <option>Department</option>
                    <option>Cost Center</option>
                  </select>
                </FormField>
              </div>
              <FormField label="Purpose" error={corpErrors.purpose} required>
                <input
                  value={corpForm.purpose}
                  onChange={(e) => setCorpForm((f) => ({ ...f, purpose: e.target.value }))}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </FormField>
              <button className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                Add Corporate Guest
              </button>
            </form>
          )}
        </div>

        <aside className="space-y-4">
          {lastGenerated && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <div className="mx-auto flex w-fit justify-center rounded-lg border border-emerald-200 bg-white p-2">
                <QRCodeSVG value={lastGenerated.qrToken} size={96} level="M" />
              </div>
              <p className="mt-2 text-sm font-semibold text-emerald-700">{lastGenerated.id}</p>
              <p className="text-xs text-emerald-600">QR Token: {lastGenerated.qrToken}</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-emerald-600">
                <Clock size={12} /> Expires in {lastGenerated.validity}
              </p>
              <button
                type="button"
                onClick={() =>
                  navigate("/app/manager/new-order", {
                    state: { guest: { name: lastGenerated.name, department: lastGenerated.organization } },
                  })
                }
                className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Create Order for {lastGenerated.name.split(" ")[0]}
              </button>
            </div>
          )}

          <div className="rounded-xl border border-ink-100 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold text-ink-700">Recent Guests</h3>
            <div className="space-y-2">
              {guests
                .slice()
                .reverse()
                .slice(0, 8)
                .map((g) => (
                  <div key={g.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-ink-800">{g.name}</p>
                      <p className="text-xs text-ink-400">{g.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={g.status === "active" ? "active" : "cancelled"}>{g.status}</Badge>
                      {g.status === "active" && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate("/app/manager/new-order", {
                              state: { guest: { name: g.name, department: g.company || g.organization || "" } },
                            })
                          }
                          className="text-xs font-semibold text-brand-600 hover:underline"
                        >
                          Create Order
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
