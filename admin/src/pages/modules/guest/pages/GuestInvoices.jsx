import { useMemo, useState } from "react";
import { Eye, Printer, Receipt } from "lucide-react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import Loader from "../../../../components/shared/Loader";
import Modal from "../../../../components/shared/Modal";
import ShareButton from "../../../../components/shared/ShareButton";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

const INVOICED_STATUSES = ["completed", "ready", "preparing", "accepted", "pending"];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function invoiceNumberFor(order) {
  const stamp = new Date(order.createdAt);
  const y = stamp.getFullYear();
  const m = String(stamp.getMonth() + 1).padStart(2, "0");
  const d = String(stamp.getDate()).padStart(2, "0");
  const suffix = order.id.replace(/[^A-Z0-9]/gi, "").slice(-6).toUpperCase();
  return `INV-${y}${m}${d}-${suffix}`;
}

export default function GuestInvoices() {
  const orders = useLiveCollection("orders", "orders.json");
  const [viewing, setViewing] = useState(null);

  const mine = useMemo(
    () =>
      (orders || [])
        .filter(
          (o) =>
            o.clientName?.toLowerCase().startsWith("guest") &&
            INVOICED_STATUSES.includes(o.status)
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [orders]
  );

  const { page, setPage, totalPages, pageItems: pagedMine } = usePagination(mine, 10);

  if (!orders) return <Loader full label="Loading invoice history..." />;

  function printInvoice(o) {
    const rows = (o.items || [])
      .map(
        (i) =>
          `<tr><td>${escapeHtml(i.name)}</td><td>${escapeHtml(i.qty)}</td><td>Tk ${escapeHtml(
            i.qty * i.unitPrice
          )}</td></tr>`
      )
      .join("");
    printOnLetterhead({
      title: invoiceNumberFor(o),
      bodyHtml: `
        <h2 style="margin:0 0 4px">Invoice</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${escapeHtml(
          invoiceNumberFor(o)
        )} · ${escapeHtml(new Date(o.createdAt).toLocaleString())}</p>
        <div class="row"><span class="label">Guest</span><span>${escapeHtml(o.clientName)}</span></div>
        <div class="row"><span class="label">Food Token</span><span>${escapeHtml(o.id)}</span></div>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="row"><span class="label">Subtotal</span><span>Tk ${escapeHtml(o.subtotal ?? o.amount)}</span></div>
        <div class="row"><span class="label">VAT (5%)</span><span>Tk ${escapeHtml(
          typeof o.tax === "number" ? o.tax.toFixed(2) : o.tax ?? 0
        )}</span></div>
        <div class="row total"><span>Grand Total</span><span>Tk ${escapeHtml(o.amount)}</span></div>
      `,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Invoice History</h1>
        <p className="text-sm text-ink-400">All confirmed invoices and food tokens from this visit.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase text-ink-400">
              <tr>
                <th className="px-4 py-3">Invoice No.</th>
                <th className="px-4 py-3">Food Token</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {pagedMine.map((o) => (
                <tr key={o.id} className="hover:bg-ink-50/40">
                  <td className="px-4 py-3 font-semibold text-ink-900">{invoiceNumberFor(o)}</td>
                  <td className="px-4 py-3 text-ink-600">{o.id}</td>
                  <td className="px-4 py-3 text-ink-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-ink-500">
                    {o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink-900">Tk {o.amount}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setViewing(o)}
                      className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {mine.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-400">
                    No invoices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-4 pb-3" />
      </div>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? invoiceNumberFor(viewing) : "Invoice Details"}
        size="sm"
      >
        {viewing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm">
              <Receipt size={16} className="text-brand-600" />
              <div>
                <p className="font-semibold text-ink-800">Food Token: {viewing.id}</p>
                <p className="text-xs text-ink-400">{new Date(viewing.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-1">
              {(viewing.items || []).map((i, idx) => (
                <div key={idx} className="flex justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
                  <span className="text-ink-600">{i.qty}x {i.name}</span>
                  <span className="font-medium text-ink-800">Tk {i.qty * i.unitPrice}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-ink-100 pt-3 text-sm">
              <div className="flex justify-between text-ink-500">
                <span>Subtotal</span>
                <span>Tk {viewing.subtotal ?? viewing.amount}</span>
              </div>
              <div className="flex justify-between text-ink-500">
                <span>VAT (5%)</span>
                <span>Tk {typeof viewing.tax === "number" ? viewing.tax.toFixed(2) : viewing.tax ?? 0}</span>
              </div>
              <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold text-ink-900">
                <span>Grand Total</span>
                <span>Tk {viewing.amount}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => printInvoice(viewing)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                <Printer size={16} /> Print Invoice
              </button>
              <ShareButton
                title={invoiceNumberFor(viewing)}
                text={`Invoice ${invoiceNumberFor(viewing)} — Tk ${viewing.amount}`}
                className="flex-1 justify-center py-2.5"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}