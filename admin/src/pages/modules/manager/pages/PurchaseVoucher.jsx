// FILE: src/pages/modules/manager/pages/PurchaseVoucher.jsx  (MODIFIED, full rewrite)
import { useState } from "react";
import { Receipt, Plus, Paperclip, X, Eye, Printer, FileSpreadsheet } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText, sanitizeNumber } from "../../../../components/utils/sanitize";
import { exportToExcel } from "../../../../components/utils/exportExcel";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Modal from "../../../../components/shared/Modal";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";
import Loader from "../../../../components/shared/Loader";

const BASE_CATEGORIES = [
  "Vegetables", "Fish", "Meat", "Rice", "Oil", "Gas", "Electricity",
  "Salary", "Maintenance", "Cleaning", "Miscellaneous",
];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Mobile Banking"];
const OTHERS = "Others (type new)";

export default function PurchaseVoucher() {
  const { push } = useToast();
  const vouchers = useLiveCollection("purchaseVouchers", "purchase-vouchers.json");
  const customCategories = useLiveCollection("customVoucherCategories", "custom-voucher-categories.json");

  const [form, setForm] = useState({
    vendor: "",
    category: "Vegetables",
    customCategory: "",
    amount: "",
    paymentMethod: "Cash",
    remarks: "",
  });
  const [attachment, setAttachment] = useState(null);
  const [viewing, setViewing] = useState(null);

  // usePagination is a hook — it MUST run on every render in the same
  // order, so it cannot sit after a conditional early return. Feed it
  // safe fallback arrays while data is still loading; the Loader below
  // still gates what actually renders.
  const safeVouchers = Array.isArray(vouchers) ? vouchers : [];
  const safeCustomCategories = Array.isArray(customCategories) ? customCategories : [];
  const allCategories = [...BASE_CATEGORIES, ...safeCustomCategories];
  const { page, setPage, totalPages, pageItems: pagedVouchers } = usePagination(
    safeVouchers.slice().reverse(),
    8
  );

  if (vouchers === null || customCategories === null) {
    return <Loader full label="Loading purchase vouchers..." />;
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachment({ name: file.name, url: URL.createObjectURL(file) });
  }

  async function submit(e) {
    e.preventDefault();
    const amount = sanitizeNumber(form.amount, { min: 1, max: 10000000 });
    const isOthers = form.category === OTHERS;
    const finalCategory = isOthers ? sanitizeText(form.customCategory, 40) : form.category;

    if (!form.vendor.trim() || amount === null) {
      push("Vendor and a valid amount are required.", "error");
      return;
    }
    if (isOthers && !finalCategory) {
      push("Type a name for the new category.", "error");
      return;
    }

    if (isOthers && !allCategories.includes(finalCategory)) {
      await dataStore.insert("customVoucherCategories", finalCategory);
    }
    setAttachment((prev) => prev); // no-op, keeps hook order stable when categories mutate

    const record = {
      id: genId("PV"),
      vendor: sanitizeText(form.vendor, 100),
      category: finalCategory,
      amount,
      paymentMethod: form.paymentMethod,
      remarks: sanitizeText(form.remarks, 200),
      attachmentName: attachment?.name || null,
      date: new Date().toISOString().slice(0, 10),
      status: "recorded",
    };
    await dataStore.insert("purchaseVouchers", record);
    push(`Voucher ${record.id} recorded${attachment ? ` with attachment "${attachment.name}"` : ""}.`, "success");
    setForm({ vendor: "", category: "Vegetables", customCategory: "", amount: "", paymentMethod: "Cash", remarks: "" });
    setAttachment(null);
  }

  function printVoucher(v) {
    printOnLetterhead({
      title: `Voucher ${v.id}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Purchase Voucher</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${v.id} · ${v.date}</p>
        <div class="row"><span class="label">Vendor</span><span>${v.vendor}</span></div>
        <div class="row"><span class="label">Category</span><span>${v.category}</span></div>
        <div class="row"><span class="label">Payment Method</span><span>${v.paymentMethod}</span></div>
        ${v.remarks ? `<div class="row"><span class="label">Remarks</span><span>${v.remarks}</span></div>` : ""}
        ${v.attachmentName ? `<div class="row"><span class="label">Reference Document</span><span>${v.attachmentName}</span></div>` : ""}
        <div class="row total"><span>Amount</span><span>Tk ${v.amount.toLocaleString()}</span></div>
      `,
    });
  }

  function downloadExcel() {
    exportToExcel(
      safeVouchers.map((v) => ({
        "Voucher No": v.id,
        Vendor: v.vendor,
        Category: v.category,
        Date: v.date,
        "Payment Method": v.paymentMethod,
        Remarks: v.remarks || "",
        "Amount (Tk)": v.amount,
      })),
      "purchase-voucher-history"
    );
    push("Voucher history downloaded.", "success");
  }

  const totalThisList = safeVouchers.reduce((s, v) => s + v.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Purchase Voucher</h1>
          <p className="text-sm text-ink-400">
            Record kitchen purchases with an optional reference document. Feeds the Financial
            Dashboard live.
          </p>
        </div>
        <button
          onClick={downloadExcel}
          className="flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
        >
          <FileSpreadsheet size={16} /> Download Full History
        </button>
      </div>

      <form onSubmit={submit} className="grid gap-4 rounded-xl border border-ink-100 bg-white p-5 sm:grid-cols-2 lg:grid-cols-5">
        <FormField label="Vendor Name" required>
          <input
            value={form.vendor}
            onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </FormField>
        <FormField label="Category" required>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            {allCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
            <option value={OTHERS}>{OTHERS}</option>
          </select>
        </FormField>
        {form.category === OTHERS && (
          <FormField label="New Category Name" required>
            <input
              value={form.customCategory}
              onChange={(e) => setForm((f) => ({ ...f, customCategory: e.target.value }))}
              placeholder="e.g. Pest Control"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
        )}
        <FormField label="Amount (Tk)" required>
          <input
            type="number"
            min="1"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </FormField>
        <FormField label="Payment Method" required>
          <select
            value={form.paymentMethod}
            onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            {PAYMENT_METHODS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Remarks">
          <input
            value={form.remarks}
            onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </FormField>

        <div className="sm:col-span-2 lg:col-span-5">
          <label className="mb-1 block text-sm font-medium text-ink-700">
            Reference Document <span className="font-normal text-ink-400">(receipt, invoice photo, etc.)</span>
          </label>
          {!attachment ? (
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink-300 px-4 py-2 text-sm text-ink-500 hover:border-brand-400 hover:text-brand-600">
              <Paperclip size={15} /> Attach a file
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={onFileChange} />
            </label>
          ) : (
            <div className="flex w-fit items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm">
              <a href={attachment.url} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">
                {attachment.name}
              </a>
              <button type="button" onClick={() => setAttachment(null)} className="text-ink-400 hover:text-brand-600">
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="sm:col-span-2 lg:col-span-5">
          <button className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            <Plus size={16} /> Save Voucher
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 flex items-center justify-between text-sm font-bold text-ink-700">
          <span className="flex items-center gap-2">
            <Receipt size={16} /> Voucher History
          </span>
          <span className="text-brand-600">Total: Tk {totalThisList.toLocaleString()}</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-ink-400">
              <tr>
                <th className="py-2 pr-3">Voucher No</th>
                <th className="py-2 pr-3">Vendor</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2 pl-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {pagedVouchers.map((v) => (
                <tr key={v.id}>
                  <td className="py-2 pr-3 font-medium text-ink-800">{v.id}</td>
                  <td className="py-2 pr-3 text-ink-600">{v.vendor}</td>
                  <td className="py-2 pr-3 text-ink-500">{v.category}</td>
                  <td className="py-2 pr-3 text-ink-400">{v.date}</td>
                  <td className="py-2 text-right font-semibold text-ink-900">
                    Tk {v.amount.toLocaleString()}
                  </td>
                  <td className="py-2 pl-3 text-right">
                    <button
                      onClick={() => setViewing(v)}
                      className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.id || "Voucher Details"} size="sm">
        {viewing && (
          <div className="space-y-3">
            <DetailRow label="Vendor" value={viewing.vendor} />
            <DetailRow label="Category" value={viewing.category} />
            <DetailRow label="Date" value={viewing.date} />
            <DetailRow label="Payment Method" value={viewing.paymentMethod} />
            {viewing.remarks && <DetailRow label="Remarks" value={viewing.remarks} />}
            {viewing.attachmentName && (
              <DetailRow
                label="Reference Document"
                value={
                  <span className="flex items-center gap-1">
                    <Paperclip size={12} /> {viewing.attachmentName}
                  </span>
                }
              />
            )}
            <div className="flex items-center justify-between border-t border-ink-100 pt-3 text-base font-bold text-ink-900">
              <span>Amount</span>
              <span>Tk {viewing.amount.toLocaleString()}</span>
            </div>
            <button
              onClick={() => printVoucher(viewing)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Printer size={16} /> Print on Company Letterhead
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
      <span className="text-ink-400">{label}</span>
      <span className="font-medium text-ink-800">{value}</span>
    </div>
  );
}