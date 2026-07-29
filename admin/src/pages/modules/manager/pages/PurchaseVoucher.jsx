import { useEffect, useState } from "react";
import { Receipt, Plus } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText, sanitizeNumber } from "../../../../components/utils/sanitize";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Loader from "../../../../components/shared/Loader";

const CATEGORIES = [
  "Vegetables", "Fish", "Meat", "Rice", "Oil", "Gas", "Electricity",
  "Salary", "Maintenance", "Cleaning", "Miscellaneous",
];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Mobile Banking"];

export default function PurchaseVoucher() {
  const { push } = useToast();
  const [vouchers, setVouchers] = useState(null);
  const [form, setForm] = useState({
    vendor: "",
    category: "Vegetables",
    amount: "",
    paymentMethod: "Cash",
    remarks: "",
  });

  useEffect(() => {
    (async () => setVouchers(await dataStore.load("purchaseVouchers", "purchase-vouchers.json")))();
  }, []);

  if (!vouchers) return <Loader full label="Loading purchase vouchers..." />;

  async function submit(e) {
    e.preventDefault();
    const amount = sanitizeNumber(form.amount, { min: 1, max: 10000000 });
    if (!form.vendor.trim() || amount === null) {
      push("Vendor and a valid amount are required.", "error");
      return;
    }
    const record = {
      id: genId("PV"),
      vendor: sanitizeText(form.vendor, 100),
      category: form.category,
      amount,
      paymentMethod: form.paymentMethod,
      remarks: sanitizeText(form.remarks, 200),
      date: new Date().toISOString().slice(0, 10),
      status: "recorded",
    };
    const next = await dataStore.insert("purchaseVouchers", record);
    setVouchers(next);
    push(`Voucher ${record.id} recorded.`, "success");
    setForm({ vendor: "", category: "Vegetables", amount: "", paymentMethod: "Cash", remarks: "" });
  }

  const totalThisList = vouchers.reduce((s, v) => s + v.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Purchase Voucher</h1>
        <p className="text-sm text-ink-400">Record kitchen purchases against an expense category (SRS §21.3).</p>
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
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Amount (\u09F3)" required>
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
          <span className="text-brand-600">Total: \u09F3{totalThisList.toLocaleString()}</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-ink-400">
              <tr>
                <th className="py-2 pr-3">Voucher No</th>
                <th className="py-2 pr-3">Vendor</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Payment</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {vouchers
                .slice()
                .reverse()
                .map((v) => (
                  <tr key={v.id}>
                    <td className="py-2 pr-3 font-medium text-ink-800">{v.id}</td>
                    <td className="py-2 pr-3 text-ink-600">{v.vendor}</td>
                    <td className="py-2 pr-3 text-ink-500">{v.category}</td>
                    <td className="py-2 pr-3 text-ink-400">{v.date}</td>
                    <td className="py-2 pr-3 text-ink-400">{v.paymentMethod}</td>
                    <td className="py-2 text-right font-semibold text-ink-900">
                      \u09F3{v.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
