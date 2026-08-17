// FILE: src/pages/modules/manager/pages/OrderApprovals.jsx (MODIFIED — uses shared recordOrderEarning, fixes guest/billedToClient bug)
import { CheckCircle2, XCircle, ClipboardList } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { recordOrderEarning } from "../../../../components/services/earnings";
import { useToast } from "../../../../components/hooks/useToast";
import { orderStatusLabel } from "../../../../components/shared/OrderPipeline";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import Loader from "../../../../components/shared/Loader";

export default function OrderApprovals() {
  const { push } = useToast();
  const orders = useLiveCollection("orders", "orders.json");
  const clients = useLiveCollection("clients", "clients.json");

  if (!orders || !clients) return <Loader full label="Loading order approvals..." />;

  const pending = orders.filter((o) => o.status === "awaiting_manager");
  const decided = orders.filter((o) => o.status === "rejected");

  async function approve(order) {
    await dataStore.update("orders", (o) => o.id === order.id, {
      status: "pending",
      managerApprovedAt: new Date().toISOString(),
    });

    // Now handles Client self-orders, guest orders billed to a Client, AND
    // pure walk-in guest orders — see earnings.js for why this was broken.
    await recordOrderEarning(order, clients);

    socket.emit(SOCKET_EVENTS.MANAGER_ACCEPTED, {
      message: `Your order ${order.id} was approved and sent to the kitchen.`,
      recipientNames: [order.clientName],
    });
    socket.emit(SOCKET_EVENTS.ORDER_SUBMITTED, {
      message: `Order ${order.id} approved by Manager — ready for the kitchen.`,
      recipientRoles: ["kitchen_head"],
    });
    push(`Order ${order.id} approved — Tk ${order.amount} recorded as earning.`, "success");
  }

  async function reject(order) {
    await dataStore.update("orders", (o) => o.id === order.id, { status: "rejected" });
    socket.emit(SOCKET_EVENTS.ORDER_REJECTED, {
      message: `Your order ${order.id} was rejected by the Manager.`,
      recipientNames: [order.clientName],
    });
    push(`Order ${order.id} rejected.`, "info");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Order Approvals</h1>
        <p className="text-sm text-ink-400">
          Instant orders placed directly by Clients or Guests wait here before moving to the kitchen.
        </p>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
          <ClipboardList size={16} /> Awaiting Approval ({pending.length})
        </h2>
        <div className="space-y-3">
          {pending.map((o) => (
            <div key={o.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink-900">{o.id} · {o.clientName}</p>
                  <p className="text-xs text-ink-500">
                    {o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                    {o.tableNumber ? ` · Table ${o.tableNumber}` : " · Take Away"}
                    {o.billedToClient ? ` · Billed to ${o.billedToClient}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink-900">Tk {o.amount}</span>
                  <button
                    onClick={() => approve(o)}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button
                    onClick={() => reject(o)}
                    className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No orders waiting for approval.</p>}
        </div>
      </div>

      {decided.length > 0 && (
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-700">Rejected</h2>
          <div className="space-y-2">
            {decided.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
                <span className="font-medium text-ink-700">{o.id} · {o.clientName}</span>
                <span className="text-ink-400">{orderStatusLabel(o.status)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}