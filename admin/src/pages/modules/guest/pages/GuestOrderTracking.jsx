import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Printer, XCircle, ReceiptText } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { useToast } from "../../../../components/hooks/useToast";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import OrderPipeline, { orderStatusLabel } from "../../../../components/shared/OrderPipeline";
import ShareButton from "../../../../components/shared/ShareButton";
import Loader from "../../../../components/shared/Loader";
import Modal from "../../../../components/shared/Modal";

const CANCELLABLE_STATUS = "awaiting_manager";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

export default function GuestOrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const orders = useLiveCollection("orders", "orders.json");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const order = useMemo(
    () => (orders || []).find((o) => o.id === orderId) || null,
    [orders, orderId]
  );

  useEffect(() => {
    if (cancelOpen && order && order.status !== CANCELLABLE_STATUS) {
      push("Manager already accepted this order — it can no longer be cancelled.", "info");
      setCancelOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status]);

  if (!orders) return <Loader full label="Loading order..." />;

  if (!order) {
    return (
      <div className="space-y-4">
        <Link
          to="/app/guest/orders"
          className="flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600"
        >
          <ArrowLeft size={14} /> Back to Active Orders
        </Link>
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
          <p className="text-sm font-medium text-ink-500">Order {orderId} was not found.</p>
        </div>
      </div>
    );
  }

  const canCancel = order.status === CANCELLABLE_STATUS;

  async function confirmCancel() {
    if (cancelling) return;
    if (order.status !== CANCELLABLE_STATUS) {
      push("This order can no longer be cancelled.", "error");
      setCancelOpen(false);
      return;
    }
    setCancelling(true);
    try {
      await dataStore.update(
        "orders",
        (o) => o.id === order.id && o.status === CANCELLABLE_STATUS,
        { status: "cancelled" }
      );
      socket.emit(SOCKET_EVENTS.ORDER_CANCELLED, {
        message: `Order ${order.id} was cancelled by the guest.`,
        recipientRoles: ["manager"],
      });
      push("Order cancelled.", "success");
      setCancelOpen(false);
    } catch {
      push("Could not cancel the order. Please try again.", "error");
    } finally {
      setCancelling(false);
    }
  }

  function printToken() {
    const rows = (order.items || [])
      .map(
        (i) =>
          `<tr><td>${escapeHtml(i.name)}</td><td>${escapeHtml(i.qty)}</td><td>Tk ${escapeHtml(
            i.qty * i.unitPrice
          )}</td></tr>`
      )
      .join("");
    printOnLetterhead({
      title: `Order ${order.id}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Order Confirmed</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${escapeHtml(order.id)} · ${escapeHtml(
        new Date(order.createdAt).toLocaleString()
      )}</p>
        <div class="row"><span class="label">Guest</span><span>${escapeHtml(order.clientName)}</span></div>
        <div class="row"><span class="label">Collection</span><span>${
          order.tableNumber ? `Table ${escapeHtml(order.tableNumber)}` : "Take Away"
        }</span></div>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="row"><span class="label">Subtotal</span><span>Tk ${escapeHtml(order.subtotal ?? order.amount)}</span></div>
        <div class="row"><span class="label">VAT (5%)</span><span>Tk ${escapeHtml(
          typeof order.tax === "number" ? order.tax.toFixed(2) : order.tax ?? 0
        )}</span></div>
        <div class="row total"><span>Total</span><span>Tk ${escapeHtml(order.amount)}</span></div>
      `,
    });
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <Link
        to="/app/guest/orders"
        className="flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft size={14} /> Back to Active Orders
      </Link>

      <div className="grid min-w-0 gap-5 lg:grid-cols-2 lg:gap-6">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2">
              <ReceiptText size={18} className="text-brand-600" />
              <h2 className="text-sm font-bold text-ink-700 sm:text-base">Order Confirmed</h2>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={printToken}
                className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:bg-brand-50"
              >
                <Printer size={14} /> Print
              </button>
              <ShareButton
                title={`Order ${order.id}`}
                text={`Order ${order.id} — Tk ${order.amount} — Status: ${orderStatusLabel(order.status)}`}
              />
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="rounded-xl bg-ink-50/60 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Token Number</p>
              <p className="mt-1 text-2xl font-bold text-ink-900">{order.id}</p>
              <p className="mt-1 text-sm text-ink-500">{order.clientName}</p>
              <p className="mt-0.5 text-xs text-ink-400">
                {order.tableNumber ? `Table ${order.tableNumber}` : "Take Away"} ·{" "}
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="space-y-1.5">
              {(order.items || []).map((i, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-ink-600">{i.qty}x {i.name}</span>
                  <span className="font-medium text-ink-800">Tk {i.qty * i.unitPrice}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 border-t border-ink-100 pt-3 text-sm">
              <div className="flex justify-between text-ink-500">
                <span>Subtotal</span>
                <span>Tk {order.subtotal ?? order.amount}</span>
              </div>
              <div className="flex justify-between text-ink-500">
                <span>VAT (5%)</span>
                <span>Tk {typeof order.tax === "number" ? order.tax.toFixed(2) : order.tax ?? 0}</span>
              </div>
              <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold text-ink-900">
                <span>Total</span>
                <span>Tk {order.amount}</span>
              </div>
            </div>

            {canCancel && (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50"
              >
                <XCircle size={16} /> Cancel Order
              </button>
            )}
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-4 sm:px-5">
            <h2 className="text-sm font-bold text-ink-700 sm:text-base">Live Order Status</h2>
            <div className="flex items-center gap-1.5 text-xs font-medium text-ink-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <p className="mb-4 text-sm text-ink-600">
              Current status: <span className="font-semibold text-ink-900">{orderStatusLabel(order.status)}</span>
            </p>
            <OrderPipeline status={order.status} />
          </div>
        </section>
      </div>

      <Modal open={cancelOpen} onClose={() => !cancelling && setCancelOpen(false)} title="Cancel Order" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            Cancel order <span className="font-semibold text-ink-900">{order.id}</span>? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={cancelling}
              onClick={confirmCancel}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Yes, Cancel Order"}
            </button>
            <button
              type="button"
              disabled={cancelling}
              onClick={() => setCancelOpen(false)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-ink-200 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50"
            >
              Keep Order
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}