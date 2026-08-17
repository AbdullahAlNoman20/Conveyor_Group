import { useState } from "react";
import {
  PackageCheck,
  Truck,
  CheckCircle2,
  Eye,
  ClipboardList,
} from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { SOCKET_EVENTS } from "../../../../components/services/socket";
import { notifyEvent } from "../../../../components/services/notifyEvent";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import { PipelineBadge } from "../../../../components/shared/OrderPipeline";
import { orderRecipientName } from "../../../../components/utils/orderRecipient";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import Loader from "../../../../components/shared/Loader";
import Modal from "../../../../components/shared/Modal";
import Pagination, {
  usePagination,
} from "../../../../components/shared/Pagination";

function isToday(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

export default function WaiterOrders({ view = "all" }) {
  const { user } = useAuth();
  const { push } = useToast();
  const orders = useLiveCollection("orders", "orders.json");
  const [viewing, setViewing] = useState(null);

  const ready = (orders || []).filter(
    (o) => o.status === "ready" && !o.assignedToWaiter,
  );
  const assigned = (orders || []).filter(
    (o) =>
      o.status === "ready" &&
      o.assignedToWaiter &&
      o.assignedWaiterName === user?.name &&
      isToday(o.assignedAt),
  );
  const delivered = (orders || []).filter(
    (o) =>
      o.status === "completed" &&
      o.assignedWaiterName === user?.name &&
      isToday(o.deliveredAt),
  );

  const readyPage = usePagination(ready, 8);
  const assignedPage = usePagination(assigned, 8);
  const deliveredPage = usePagination(delivered, 8);

  if (!orders) return <Loader full label="Loading orders..." />;

  async function assign(order) {
    await dataStore.update("orders", (o) => o.id === order.id, {
      assignedToWaiter: true,
      assignedWaiterName: user?.name,
      assignedAt: new Date().toISOString(),
    });
    push(`Order ${order.id} assigned to you for delivery.`, "success");
  }

  async function deliver(order) {
    await dataStore.update("orders", (o) => o.id === order.id, {
      status: "completed",
      deliveredAt: new Date().toISOString(),
    });
    await notifyEvent(SOCKET_EVENTS.FOOD_SERVED, {
      message: `Order ${order.id} served.`,
      recipientNames: [orderRecipientName(order)],
    });
    push(`Order ${order.id} marked as delivered.`, "success");
  }

  const showReady = view === "all" || view === "ready";
  const showAssigned = view === "all" || view === "assigned";
  const showDelivered = view === "all" || view === "delivered";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">
          {view === "ready"
            ? "Ready Orders"
            : view === "assigned"
              ? "Assigned Orders"
              : view === "delivered"
                ? "Delivered Orders"
                : "My Orders"}
        </h1>
        <p className="text-sm text-ink-400">
          {view === "ready" &&
            "Orders the kitchen has marked ready for pickup."}
          {view === "assigned" &&
            "Orders currently in your hands — deliver them to the table."}
          {view === "delivered" && "Everything you've delivered today."}
          {view === "all" &&
            "Receive ready orders from the kitchen and deliver them to the table."}
        </p>
      </div>

      {showReady && (
        <Section
          title="Ready Orders"
          icon={PackageCheck}
          pagination={readyPage}
          count={ready.length}
        >
          {readyPage.pageItems.map((o) => (
            <Row key={o.id} order={o} onView={() => setViewing(o)}>
              <button
                onClick={() => assign(o)}
                className="rounded-lg bg-ink-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-900"
              >
                Receive
              </button>
            </Row>
          ))}
          {ready.length === 0 && <Empty text="Nothing waiting for pickup." />}
        </Section>
      )}

      {showAssigned && (
        <Section
          title="Assigned Orders"
          icon={Truck}
          pagination={assignedPage}
          count={assigned.length}
        >
          {assignedPage.pageItems.map((o) => (
            <Row key={o.id} order={o} onView={() => setViewing(o)}>
              <button
                onClick={() => deliver(o)}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
              >
                Collect & Deliver
              </button>
            </Row>
          ))}
          {assigned.length === 0 && (
            <Empty text="No orders in your hands right now." />
          )}
        </Section>
      )}

      {showDelivered && (
        <Section
          title="Delivered Orders"
          icon={CheckCircle2}
          pagination={deliveredPage}
          count={delivered.length}
        >
          {deliveredPage.pageItems.map((o) => (
            <Row key={o.id} order={o} onView={() => setViewing(o)} />
          ))}
          {delivered.length === 0 && (
            <Empty text="Nothing delivered yet today." />
          )}
        </Section>
      )}

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.id || "Order Details"}
        size="sm"
      >
        {viewing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm">
              <ClipboardList size={16} className="text-brand-600" />
              <div>
                <p className="font-semibold text-ink-800">
                  {viewing.clientName}
                </p>
                <p className="text-xs text-ink-400">
                  {viewing.tableNumber
                    ? `Table ${viewing.tableNumber}`
                    : "Take Away"}{" "}
                  · {new Date(viewing.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {(viewing.items || []).map((i, idx) => (
                <div
                  key={idx}
                  className="flex justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm"
                >
                  <span className="text-ink-600">
                    {i.qty}x {i.name}
                  </span>
                  <span className="font-medium text-ink-800">
                    Tk {i.qty * i.unitPrice}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-ink-100 pt-3 text-base font-bold text-ink-900">
              <span>Total</span>
              <span>Tk {viewing.amount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
              <span className="text-ink-500">Status</span>
              <PipelineBadge status={viewing.status} />
            </div>
            {viewing.deliveredAt && (
              <p className="text-center text-xs text-ink-400">
                Delivered {new Date(viewing.deliveredAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Section({ title, icon: Icon, children, pagination, count }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
        <Icon size={16} /> {title}{" "}
        <span className="ml-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-500">
          {count}
        </span>
      </h2>
      <div className="space-y-2">{children}</div>
      {pagination && count > 0 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={pagination.setPage}
        />
      )}
    </div>
  );
}

function Row({ order, children, onView }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-3 text-sm">
      <div className="min-w-0">
        <span className="font-semibold text-ink-800">{order.id}</span>
        <span className="ml-2 text-ink-500">{order.clientName}</span>
      </div>
      <span className="text-ink-500">
        {order.tableNumber ? `Table ${order.tableNumber}` : "Take Away"}
      </span>
      <PipelineBadge status={order.status} />
      <div className="flex items-center gap-2">
        <button
          onClick={onView}
          className="rounded-lg border border-ink-200 p-1.5 text-ink-500 hover:border-brand-300 hover:bg-brand-50"
          title="View Details"
        >
          <Eye size={14} />
        </button>
        {children}
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <p className="py-4 text-center text-sm text-ink-400">{text}</p>;
}
