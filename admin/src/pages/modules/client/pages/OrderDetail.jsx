// FILE: src/pages/modules/client/pages/OrderDetail.jsx
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, CheckCircle2 } from "lucide-react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import CompletedOrderSteps from "../../../../components/shared/CompletedOrderSteps";
import Loader from "../../../../components/shared/Loader";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orders = useLiveCollection("orders", "orders.json");

  if (!orders) return <Loader full label="Loading order..." />;
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="w-full min-w-0 space-y-4 overflow-x-hidden">
        <button
          onClick={() => navigate("/app/client/statement")}
          className="flex max-w-full items-center gap-1 text-sm font-semibold text-ink-500 transition hover:text-brand-600"
        >
          <ArrowLeft size={16} className="shrink-0" />
          <span>Back to Monthly Statement</span>
        </button>

        <p className="rounded-xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400 sm:p-10">
          Order not found.
        </p>
      </div>
    );
  }

  function printAll() {
    printOnLetterhead({
      title: `Order ${order.id}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Order Receipt & Token</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${order.id} · ${new Date(order.createdAt).toLocaleString()}</p>
        <div class="row"><span class="label">Customer</span><span>${order.clientName}</span></div>
        ${order.tableNumber ? `<div class="row"><span class="label">Table</span><span>${order.tableNumber}</span></div>` : `<div class="row"><span class="label">Order Type</span><span>Take Away</span></div>`}
        <div class="row"><span class="label">Status</span><span>Completed</span></div>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
          <tbody>${(order.items || []).map((i) => `<tr><td>${i.name}</td><td>${i.qty}</td><td>Tk ${i.qty * i.unitPrice}</td></tr>`).join("")}</tbody>
        </table>
        <div class="row"><span class="label">Subtotal</span><span>Tk ${order.subtotal ?? order.amount}</span></div>
        ${order.tax ? `<div class="row"><span class="label">VAT (5%)</span><span>Tk ${order.tax}</span></div>` : ""}
        <div class="row total"><span>Total</span><span>Tk ${order.amount}</span></div>
      `,
    });
  }

  return (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden sm:space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate("/app/client/statement")}
        className="flex max-w-full items-center gap-1 text-sm font-semibold text-ink-500 transition hover:text-brand-600"
      >
        <ArrowLeft size={16} className="shrink-0" />
        <span>Back to Monthly Statement</span>
      </button>

      {/* Header */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="min-w-0 break-all text-xl font-bold text-ink-900 sm:text-2xl">
            {order.id}
          </h1>

          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 size={13} />
            Completed
          </span>
        </div>

        <button
          onClick={printAll}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 sm:w-auto sm:py-2"
        >
          <Printer size={16} className="shrink-0" />
          <span>Print Invoice & Token</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Invoice */}
        <div className="min-w-0 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-3 text-sm font-bold text-ink-700">
            Invoice
          </h2>

          {/* Order Information */}
          <div className="mb-4 space-y-2 text-sm">
            <div className="flex min-w-0 items-start justify-between gap-4 text-ink-500">
              <span className="shrink-0">Date</span>

              <span className="min-w-0 break-words text-right font-medium text-ink-800">
                {new Date(order.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="flex min-w-0 items-start justify-between gap-4 text-ink-500">
              <span className="shrink-0">
                {order.tableNumber ? "Table" : "Order Type"}
              </span>

              <span className="min-w-0 break-words text-right font-medium text-ink-800">
                {order.tableNumber
                  ? `Table ${order.tableNumber}`
                  : "Take Away"}
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2 rounded-lg bg-ink-50 p-3 text-sm">
            {(order.items || []).map((i, idx) => (
              <div
                key={idx}
                className="flex min-w-0 items-start justify-between gap-3"
              >
                <span className="min-w-0 flex-1 break-words text-ink-600">
                  {i.qty}x {i.name}
                </span>

                <span className="shrink-0 whitespace-nowrap font-medium text-ink-800">
                  Tk {i.qty * i.unitPrice}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-3 space-y-2 border-t border-ink-100 pt-3 text-sm">
            <div className="flex items-center justify-between gap-4 text-ink-500">
              <span>Subtotal</span>
              <span className="shrink-0 whitespace-nowrap">
                Tk {order.subtotal ?? order.amount}
              </span>
            </div>

            {order.tax ? (
              <div className="flex items-center justify-between gap-4 text-ink-500">
                <span>VAT (5%)</span>
                <span className="shrink-0 whitespace-nowrap">
                  Tk {order.tax}
                </span>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-4 text-base font-bold text-ink-900">
              <span>Total</span>
              <span className="shrink-0 whitespace-nowrap">
                Tk {order.amount}
              </span>
            </div>
          </div>
        </div>

        {/* Order Progress */}
        <div className="min-w-0 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-sm font-bold text-ink-700">
            Order Progress
          </h2>

          <div className="min-w-0">
            <CompletedOrderSteps />
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-ink-400">
            This order was placed and fulfilled instantly — every step above
            is done.
          </p>
        </div>
      </div>
    </div>
  );
}