// admin/src/pages/modules/super-admin/pages/BulkImportClients.jsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Users,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { apiPost } from "../../../../components/services/api";
import { dataStore } from "../../../../components/services/dataStore";
import { exportToExcel } from "../../../../components/utils/exportExcel";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";

// Imported employees are always on the daily fixed meal — the template's Meal
// Plan column is pre-filled and locked, so it is read for display only and
// never trusted as input.
const MEAL_BENEFITS = ["Self Paid", "Complimentary"];

/**
 * Header text is matched loosely — lowercased with non-alphanumerics stripped —
 * so "Employee ID", "employee_id" and "EmployeeID" all resolve to the same
 * field. Anything unrecognised is ignored rather than failing the whole file.
 */
const FIELD_BY_HEADER = {
  fullname: "name",
  name: "name",
  employeeid: "employeeId",
  empid: "employeeId",
  id: "employeeId",
  email: "email",
  emailaddress: "email",
  phone: "phone",
  mobile: "phone",
  phonenumber: "phone",
  department: "department",
  dept: "department",
  designation: "designation",
  jobtitle: "designation",
  title: "designation",
  mealbenefit: "mealBenefit",
  benefit: "mealBenefit",
};

const normalise = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRow(row) {
  if (!row.name) return "Full Name is required.";
  if (!row.employeeId) return "Employee ID is required.";
  if (!row.email) return "Email is required.";
  if (!EMAIL_RE.test(row.email)) return "Email address is not valid.";
  if (!row.department) return "Department is required.";
  return null;
}

export default function BulkImportClients() {
  const navigate = useNavigate();
  const { push } = useToast();
  const fileRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState(null);

  /**
   * Served as a static file rather than generated here: the template's locked
   * Meal Plan column and Meal Benefit dropdown are real Excel features that
   * SheetJS cannot write, and they are what stop bad values reaching the
   * importer in the first place.
   */
  function downloadTemplate() {
    const a = document.createElement("a");
    a.href = "/templates/cccms-client-import-template.xlsx";
    a.download = "cccms-client-import-template.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    push("Template downloaded — fill in the Employees tab.", "info");
  }

  function _unusedGeneratedTemplate() {
    const example = (name, id, email, phone, dept, title, benefit) => ({
      "Full Name": name,
      "Employee ID": id,
      Email: email,
      Phone: phone,
      Department: dept,
      Designation: title,
      "Meal Plan": "Fixed Company Meal",
      "Meal Benefit": benefit,
    });

    exportToExcel(
      [
        example(
          "Md. Rafiqul Islam", "EMP-2001", "rafiqul.islam@conveyorgroup.com",
          "01712-345678", "Finance", "Senior Accountant", "Self Paid",
        ),
        example(
          "Ayesha Siddika", "EMP-2002", "ayesha.siddika@conveyorgroup.com",
          "", "Human Resources", "HR Officer", "Complimentary",
        ),
      ],
      "cccms-client-import-template",
      "Employees",
    );
  }

  function pickFile() {
    setParseError("");
    setReport(null);
    fileRef.current?.click();
  }

  async function onFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError("");
    setReport(null);
    setRows([]);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) throw new Error("That workbook has no sheets.");

      // Read as a raw grid rather than objects: the template has a banner above
      // the header, so the header is not on row 1 and XLSX's automatic object
      // mode would mistake the banner for column names.
      const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" });

      const headerIndex = grid.findIndex((r) =>
        r.some((cell) => normalise(cell) === "fullname" || normalise(cell) === "name"),
      );
      if (headerIndex === -1) {
        throw new Error(
          "Couldn't find a header row. Make sure the sheet has a 'Full Name' column.",
        );
      }

      const headerRow = grid[headerIndex];
      const columnMap = headerRow.map((cell) => FIELD_BY_HEADER[normalise(cell)] ?? null);

      const parsed = [];
      for (let i = headerIndex + 1; i < grid.length; i++) {
        const raw = grid[i];
        const record = {};
        columnMap.forEach((field, col) => {
          if (field) record[field] = String(raw[col] ?? "").trim();
        });

        // Skip blank spacer rows entirely instead of reporting them as errors.
        if (!Object.values(record).some(Boolean)) continue;

        record.email = record.email?.toLowerCase() ?? "";
        record.rowNumber = i + 1; // 1-based, matching what the user sees in Excel
        // Anything outside the two supported benefits — including a blank
        // cell — falls back to the safe default rather than failing the row.
        record.mealBenefit = MEAL_BENEFITS.includes(record.mealBenefit)
          ? record.mealBenefit
          : "Self Paid";
        record.error = validateRow(record);

        parsed.push(record);
      }

      if (!parsed.length) throw new Error("No data rows found below the header.");
      if (parsed.length > 500) throw new Error("Import at most 500 employees per file.");

      setRows(parsed);
    } catch (err) {
      setParseError(err?.message || "Couldn't read that file.");
      setRows([]);
    } finally {
      // Reset so re-picking the same filename still fires onChange.
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const validRows = rows.filter((r) => !r.error);
  const invalidRows = rows.filter((r) => r.error);

  async function runImport() {
    setImporting(true);
    try {
      const result = await apiPost("/clients/bulk-import", {
        rows: validRows.map(({ error: _error, ...r }) => r),
      });

      setReport(result);
      setRows([]);
      await dataStore.load("clients");

      push(
        `${result.created} account(s) created${result.skipped ? `, ${result.skipped} skipped` : ""}.`,
        result.created > 0 ? "success" : "error",
      );
    } catch (err) {
      push(err?.message || "Import failed. Please try again.", "error");
    } finally {
      setImporting(false);
    }
  }

  function downloadReport() {
    exportToExcel(
      report.results.map((r) => ({
        Row: r.rowNumber,
        "Full Name": r.name,
        "Employee ID": r.employeeId,
        Email: r.email,
        Result: r.status === "created" ? "Created" : "Skipped",
        Reason: r.error || "",
      })),
      `client-import-report-${new Date().toISOString().slice(0, 10)}`,
    );
  }

  function reset() {
    setRows([]);
    setReport(null);
    setFileName("");
    setParseError("");
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 sm:space-y-6">
      <button
        onClick={() => navigate("/app/super-admin/clients")}
        className="flex items-center gap-1 text-sm font-semibold text-ink-500 transition hover:text-brand-600"
      >
        <ArrowLeft size={16} /> Back to Clients
      </button>

      <div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
          Import Clients from Excel
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-400">
          Upload a spreadsheet to create many employee accounts at once. Each
          person signs in with their email as a temporary password and must
          choose a new one before using the system.
        </p>
      </div>

      {/* Step 1 — template */}
      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-700">1. Get the template</h2>
        <p className="mt-1 text-xs leading-5 text-ink-500">
          Required: Full Name, Employee ID, Email, Department. Optional: Phone,
          Designation, Meal Benefit (Self Paid or Complimentary — blank means
          Self Paid). Every imported employee is on the Fixed Company Meal plan.
        </p>
        <Button
          variant="secondary"
          icon={Download}
          onClick={downloadTemplate}
          className="mt-3 w-full justify-center sm:w-auto"
        >
          Download Template
        </Button>
      </section>

      {/* Step 2 — upload */}
      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-700">2. Upload your file</h2>

        <button
          type="button"
          onClick={pickFile}
          className="mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 py-8 text-ink-500 transition hover:border-brand-400 hover:text-brand-600"
        >
          <FileSpreadsheet size={26} />
          <span className="text-sm font-semibold">
            {fileName || "Choose an .xlsx or .csv file"}
          </span>
          <span className="text-xs text-ink-400">Up to 500 employees per file</span>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={onFileChosen}
        />

        {parseError && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs leading-5 text-brand-700">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {parseError}
          </p>
        )}
      </section>

      {/* Step 3 — preview */}
      {rows.length > 0 && (
        <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-ink-700">
              3. Review ({rows.length} row{rows.length === 1 ? "" : "s"})
            </h2>
            <button
              onClick={reset}
              className="flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-600"
            >
              <Trash2 size={13} /> Clear
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-emerald-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                Ready to import
              </p>
              <p className="text-lg font-bold text-emerald-700">{validRows.length}</p>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                Will be skipped
              </p>
              <p className="text-lg font-bold text-amber-700">{invalidRows.length}</p>
            </div>
          </div>

          <div className="mt-4 w-full overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase text-ink-400">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2.5">Row</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Name</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Employee ID</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Email</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Department</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Meal Benefit</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((r) => (
                  <tr key={r.rowNumber} className={r.error ? "bg-brand-50/40" : ""}>
                    <td className="px-3 py-2.5 text-ink-400">{r.rowNumber}</td>
                    <td className="max-w-[180px] truncate px-3 py-2.5 font-medium text-ink-800">
                      {r.name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-ink-500">
                      {r.employeeId || "—"}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-2.5 text-ink-500">
                      {r.email || "—"}
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-2.5 text-ink-500">
                      {r.department || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-ink-500">
                      {r.mealBenefit}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.error ? (
                        <span className="text-xs font-medium text-brand-600">{r.error}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <CheckCircle2 size={12} /> Ready
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            variant="primary"
            icon={Upload}
            loading={importing}
            disabled={validRows.length === 0}
            onClick={runImport}
            fullWidth
            className="mt-4"
          >
            {importing
              ? "Creating accounts..."
              : `Import ${validRows.length} Account${validRows.length === 1 ? "" : "s"}`}
          </Button>
        </section>
      )}

      {/* Result */}
      {report && (
        <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink-700">
              <Users size={15} /> Import Complete
            </h2>
            <Button variant="secondary" icon={Download} size="sm" onClick={downloadReport}>
              Download Report
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-emerald-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                Created
              </p>
              <p className="text-lg font-bold text-emerald-700">{report.created}</p>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                Skipped
              </p>
              <p className="text-lg font-bold text-amber-700">{report.skipped}</p>
            </div>
          </div>

          <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2.5 text-xs leading-5 text-ink-500">
            Each new employee signs in with their email address as both the
            username and the temporary password, then sets a real password
            before anything else loads.
          </p>

          {report.skipped > 0 && (
            <div className="mt-4 w-full overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-ink-50 text-xs uppercase text-ink-400">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2.5">Row</th>
                    <th className="whitespace-nowrap px-3 py-2.5">Name</th>
                    <th className="whitespace-nowrap px-3 py-2.5">Employee ID</th>
                    <th className="whitespace-nowrap px-3 py-2.5">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {report.results
                    .filter((r) => r.status === "skipped")
                    .map((r) => (
                      <tr key={r.rowNumber}>
                        <td className="px-3 py-2.5 text-ink-400">{r.rowNumber}</td>
                        <td className="max-w-[180px] truncate px-3 py-2.5 text-ink-800">
                          {r.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-ink-500">
                          {r.employeeId}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-medium text-brand-600">
                          {r.error}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="secondary" onClick={reset} fullWidth>
              Import Another File
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate("/app/super-admin/clients")}
              fullWidth
            >
              View Clients
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}