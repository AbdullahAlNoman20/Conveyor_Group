// FILE: src/pages/modules/client/pages/OrderDetail.jsx
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import Badge from "../../../../components/shared/Badge";
import OrderPipeline, {
  orderStatusLabel,
} from "../../../../components/shared/OrderPipeline";
import Loader from "../../../../components/shared/Loader";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const orders = useLiveCollection("orders", "orders.json");

  if (!orders) return <Loader full label="Loading order..." />;
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/app/client/orders")}
          className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600"
        >
          <ArrowLeft size={16} /> Back to Order History
        </button>
        <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
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
        <div class="row"><span class="label">Status</span><span>${orderStatusLabel(order.status)}</span></div>
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
    <div className="space-y-6">
      <button
        onClick={() => navigate("/app/client/orders")}
        className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft size={16} /> Back to Order History
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-ink-900">{order.id}</h1>
          <Badge tone={order.status}>{order.status}</Badge>
        </div>
        <button
          onClick={printAll}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Printer size={16} /> Print Invoice & Token
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invoice / token side */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Invoice</h2>
          <div className="mb-4 space-y-1 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>Date</span>
              <span className="font-medium text-ink-800">
                {new Date(order.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-ink-500">
              <span>{order.tableNumber ? "Table" : "Order Type"}</span>
              <span className="font-medium text-ink-800">
                {order.tableNumber ? `Table ${order.tableNumber}` : "Take Away"}
              </span>
            </div>
          </div>

          <div className="space-y-1 rounded-lg bg-ink-50 p-3 text-sm">
            {(order.items || []).map((i, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-ink-600">
                  {i.qty}x {i.name}
                </span>
                <span className="font-medium text-ink-800">
                  Tk {i.qty * i.unitPrice}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1 border-t border-ink-100 pt-3 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>Subtotal</span>
              <span>Tk {order.subtotal ?? order.amount}</span>
            </div>
            {order.tax ? (
              <div className="flex justify-between text-ink-500">
                <span>VAT (5%)</span>
                <span>Tk {order.tax}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-bold text-ink-900">
              <span>Total</span>
              <span>Tk {order.amount}</span>
            </div>
          </div>
        </div>

        {/* Pipeline side — live */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-ink-700">
            Order Progress
          </h2>
          <OrderPipeline status={order.status} />
          <p className="mt-4 text-xs text-ink-400">
            Updates live as the Manager and Kitchen act on this order — you'll
            get a notification with sound at every step.
          </p>
        </div>
      </div>
    </div>
  );
}
