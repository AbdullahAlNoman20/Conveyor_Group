// FILE: src/pages/modules/client/pages/OrderConfirmation.jsx (MODIFIED — shows full completed step pipeline)
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, CheckCircle2 } from "lucide-react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import CompletedOrderSteps from "../../../../components/shared/CompletedOrderSteps";
import Loader from "../../../../components/shared/Loader";

export default function OrderConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orders = useLiveCollection("orders", "orders.json");

  if (!orders) return <Loader full label="Loading your order..." />;
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate("/app/client")} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">Order not found.</p>
      </div>
    );
  }

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
          <tbody>${(order.items || []).map((i) => `<tr><td>${i.name}</td><td>${i.qty}</td></tr>`).join("")}</tbody>
        </table>
        <div class="row"><span class="label">Subtotal</span><span>Tk ${order.subtotal}</span></div>
        <div class="row"><span class="label">VAT (5%)</span><span>Tk ${order.tax}</span></div>
        <div class="row total"><span>Total</span><span>Tk ${order.amount}</span></div>
      `,
    });
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/app/client")} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="flex items-center gap-2 text-emerald-600">
        <CheckCircle2 size={22} />
        <h1 className="text-lg font-bold text-ink-900 sm:text-xl">Order Completed</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Token Number</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700 sm:text-3xl">{order.id}</p>
            <p className="mt-1 text-sm text-ink-600">{order.clientName}</p>
          </div>

          <div className="mt-4 max-h-56 space-y-1 overflow-y-auto rounded-lg bg-ink-50 p-3 text-sm">
            {(order.items || []).map((i, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-ink-600">{i.qty}x {i.name}</span>
                <span className="font-medium text-ink-800">Tk {i.qty * i.unitPrice}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1 border-t border-ink-100 pt-3 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>Subtotal</span><span>Tk {order.subtotal}</span>
            </div>
            <div className="flex justify-between text-ink-500">
              <span>VAT (5%)</span><span>Tk {order.tax}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-ink-900">
              <span>Total</span><span>Tk {order.amount}</span>
            </div>
          </div>

          <button
            onClick={printToken}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Printer size={16} /> Print Token
          </button>
        </div>

        {/* Full pipeline, every step shown as completed */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-ink-700">Order Progress</h2>
          <CompletedOrderSteps />
          <p className="mt-5 text-center text-xs text-ink-400">
            Your order was placed and completed instantly — every step above is done.
          </p>
        </div>
      </div>
    </div>
  );
}