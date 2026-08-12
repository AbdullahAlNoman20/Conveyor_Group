// FILE: src/components/utils/registrationForm.js (NEW)
import { printOnLetterhead } from "./printLetterhead";

const FIELDS = [
  "Full Name",
  "Employee ID",
  "Email",
  "Phone",
  "Department",
  "Designation",
  "Employment Type (Company Employee / External Client / Contractor / Temporary Employee)",
  "Meal Plan (Fixed Company Meal / Custom Menu / Complimentary Meal)",
  "Meal Benefit (Company Subsidized / Complimentary / Self Paid)",
  "Signature",
  "Date",
];

/** Opens a print-ready blank client registration form (Save-as-PDF via the
 * browser print dialog) for a Super Admin to hand out for manual fill-up. */
export function printBlankRegistrationForm() {
  const bodyHtml = `
    <h2 style="margin:0 0 4px;font-size:16px;">Client Registration Form</h2>
    <p style="margin:0 0 20px;font-size:12px;color:#595959;">
      Please fill in block letters. Submit this form to the Super Admin office for account activation.
    </p>
    ${FIELDS.map(
      (label) => `
        <div style="margin-bottom:22px;">
          <div style="font-size:12px;color:#595959;margin-bottom:4px;">${label}</div>
          <div style="border-bottom:1px solid #0d0d0e;height:22px;"></div>
        </div>`
    ).join("")}
  `;
  printOnLetterhead({ title: "Client Registration Form", bodyHtml });
}