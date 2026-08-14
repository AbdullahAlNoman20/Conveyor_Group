// FILE: src/components/shared/OrderTokenModal.jsx (NEW)
import { Printer, Save } from "lucide-react";
import Modal from "./Modal";
import { printOnLetterhead } from "../utils/printLetterhead";

export default function OrderTokenModal({ open, onClose, order }) {
  if (!order) return null;

  function printToken() {
    printOnLetterhead({
      title: `Token ${order.id}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Order Token</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${order.id} · ${new Date(order.createdAt).toLocaleString()}</p>
        <div class="row"><span class="label">Customer</span><span>${order.clientName}</span></div>
        ${order.tableNumber ? `<div class="row"><span class="label">Table</span><span>${order.tableNumber}</span></div>` : `<div class="row"><span class="label">Order Type</span><span>Take Away</span></div>`}
        <table>
          <thead><tr><th>Item</th><th>Qty</th></tr></thead>
          <tbody>
            ${(order.items || []).map((i) => `<tr><td>${i.name}</td><td>${i.qty}</td></tr>`).join("")}
          </tbody>
        </table>
        <div class="row total"><span>Total</span><span>Tk ${order.amount}</span></div>
      `,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Order Confirmed" size="sm">
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Token Number</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{order.id}</p>
          <p className="mt-1 text-sm text-ink-600">{order.clientName}</p>
        </div>

        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-ink-50 p-3 text-sm">
          {(order.items || []).map((i, idx) => (
            <div key={idx} className="flex justify-between">
              <span className="text-ink-600">{i.qty}x {i.name}</span>
              <span className="font-medium text-ink-800">Tk {i.qty * i.unitPrice}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={printToken}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Printer size={16} /> Print Token
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-ink-200 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
          >
            <Save size={16} /> Save & Close
          </button>
        </div>
        <p className="text-center text-xs text-ink-400">
          Saved automatically to this order's history.
        </p>
      </div>
    </Modal>
  );
}