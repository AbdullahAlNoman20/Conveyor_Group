import { useState } from "react";
import { Clock, ChefHat, AlertTriangle, CheckCircle2 } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { useToast } from "../../../../components/hooks/useToast";
import { PipelineBadge } from "../../../../components/shared/OrderPipeline";
import { orderRecipientName } from "../../../../components/utils/orderRecipient";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import Modal from "../../../../components/shared/Modal";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

const PREP_TIMES = [10, 15, 20, 30];
const DELAY_REASONS = ["Ingredient Shortage", "High Kitchen Workload", "Equipment Issue"];
const PRIORITY_RANK = { urgent: 0, vip: 1, high: 2, normal: 3 };

export default function KitchenQueue() {
  const { push } = useToast();
  const orders = useLiveCollection("orders", "orders.json");
  const [prepModalOrder, setPrepModalOrder] = useState(null);
  const [customTime, setCustomTime] = useState("");
  const [delayModalOrder, setDelayModalOrder] = useState(null);

  async function updateOrder(id, patch, event, message, recipients = {}) {
    await dataStore.update("orders", (o) => o.id === id, patch);
    if (event) await notifyEvent(event, { message, ...recipients });
    if (message) push(message, "success");
  }

  function accept(order) {
    updateOrder(
      order.id,
      { status: "accepted" },
      SOCKET_EVENTS.KITCHEN_ACCEPTED,
      `Order ${order.id} accepted.`,
      { recipientNames: [orderRecipientName(order)] }
    );
  }

  function setPrepTime(minutes) {
    if (!prepModalOrder) return;
    updateOrder(
      prepModalOrder.id,
      { status: "preparing", prepMinutes: minutes, prepStartedAt: new Date().toISOString() },
      SOCKET_EVENTS.PREPARATION_STARTED,
      `Cooking started — ${minutes} min for ${prepModalOrder.id}.`,
      { recipientNames: [orderRecipientName(prepModalOrder)] }
    );
    setPrepModalOrder(null);
    setCustomTime("");
  }

  function markReady(order) {
    updateOrder(
      order.id,
      { status: "ready" },
      SOCKET_EVENTS.FOOD_READY,
      `Order ${order.id} is ready for collection.`,
      { recipientNames: [orderRecipientName(order)], recipientRoles: ["waiter"] }
    );
  }

  function markCompleted(order) {
    updateOrder(
      order.id,
      { status: "completed" },
      SOCKET_EVENTS.ORDER_COMPLETED,
      `Order ${order.id} completed.`,
      { recipientNames: [orderRecipientName(order)] }
    );
  }

  function confirmDelay(reason) {
    if (!delayModalOrder) return;
    updateOrder(
      delayModalOrder.id,
      { status: "delayed", delayReason: reason },
      SOCKET_EVENTS.ORDER_DELAYED,
      `Order ${delayModalOrder.id} marked delayed: ${reason}.`,
      { recipientNames: [orderRecipientName(delayModalOrder)] }
    );
    setDelayModalOrder(null);
  }

  const KITCHEN_VISIBLE = ["pending", "accepted", "preparing", "delayed", "ready"];
  const queue = [...(orders || [])]
    .filter((o) => KITCHEN_VISIBLE.includes(o.status))
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3));
  const { page, setPage, totalPages, pageItems: pagedQueue } = usePagination(queue, 20);

  if (!orders) return <Loader full label="Loading kitchen queue..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Kitchen Queue</h1>
        <p className="text-sm text-ink-400">FIFO, adjusted by priority. Act on each order as it moves through the workflow.</p>
      </div>

      <div className="space-y-3">
        {pagedQueue.map((o) => (
          <div key={o.id} className="rounded-xl border border-ink-100 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-ink-900">{o.id}</p>
                  {o.priority !== "normal" && (
                    <span className="rounded bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700">
                      {o.priority}
                    </span>
                  )}
                  <PipelineBadge status={o.status} />
                </div>
                <p className="text-sm text-ink-500">{o.clientName}</p>
                <p className="text-xs text-ink-400">
                  {o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                  {o.tableNumber ? ` · Table ${o.tableNumber}` : " · Take Away"}
                </p>
                {o.delayReason && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-brand-600">
                    <AlertTriangle size={12} /> Delayed: {o.delayReason}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {o.status === "pending" && (
                  <button
                    onClick={() => accept(o)}
                    className="flex items-center gap-1 rounded-lg bg-ink-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-900"
                  >
                    <CheckCircle2 size={14} /> Accept
                  </button>
                )}
                {o.status === "accepted" && (
                  <button
                    onClick={() => setPrepModalOrder(o)}
                    className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    <Clock size={14} /> Set Prep Time
                  </button>
                )}
                {o.status === "preparing" && (
                  <button
                    onClick={() => markReady(o)}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <ChefHat size={14} /> Mark Ready
                  </button>
                )}
                {o.status === "ready" && (
                  <button
                    onClick={() => markCompleted(o)}
                    className="flex items-center gap-1 rounded-lg bg-ink-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-900"
                  >
                    <CheckCircle2 size={14} /> Mark Completed
                  </button>
                )}
                {["accepted", "preparing"].includes(o.status) && (
                  <button
                    onClick={() => setDelayModalOrder(o)}
                    className="flex items-center gap-1 rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                  >
                    <AlertTriangle size={14} /> Delay
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {queue.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
            Queue is empty.
          </p>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal open={!!prepModalOrder} onClose={() => setPrepModalOrder(null)} title="Set Preparation Time" size="sm">
        <div className="grid grid-cols-2 gap-2">
          {PREP_TIMES.map((m) => (
            <button
              key={m}
              onClick={() => setPrepTime(m)}
              className="rounded-lg border border-ink-200 py-2 text-sm font-semibold hover:border-brand-400 hover:bg-brand-50"
            >
              {m} Minutes
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            type="number"
            placeholder="Custom minutes"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <button
            onClick={() => customTime && setPrepTime(Number(customTime))}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Set
          </button>
        </div>
      </Modal>

      <Modal open={!!delayModalOrder} onClose={() => setDelayModalOrder(null)} title="Reason for Delay" size="sm">
        <div className="space-y-2">
          {DELAY_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => confirmDelay(reason)}
              className="w-full rounded-lg border border-ink-200 py-2 text-sm font-medium hover:border-brand-400 hover:bg-brand-50"
            >
              {reason}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
