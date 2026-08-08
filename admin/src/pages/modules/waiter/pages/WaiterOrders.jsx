// FILE: src/pages/modules/waiter/pages/WaiterOrders.jsx  (MODIFIED, full rewrite — now has 3 independently-paginated sections)
import { PackageCheck, Truck, CheckCircle2 } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { useToast } from "../../../../components/hooks/useToast";
import { PipelineBadge } from "../../../../components/shared/OrderPipeline";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

export default function WaiterOrders() {
  const { push } = useToast();
  const orders = useLiveCollection("orders", "orders.json");

  const ready = (orders || []).filter((o) => o.status === "ready" && !o.assignedToWaiter);
  const assigned = (orders || []).filter((o) => o.status === "ready" && o.assignedToWaiter);
  const delivered = (orders || []).filter((o) => o.status === "completed");

  const readyPage = usePagination(ready, 8);
  const assignedPage = usePagination(assigned, 8);
  const deliveredPage = usePagination(delivered, 8);

  if (!orders) return <Loader full label="Loading orders..." />;

  async function assign(order) {
    await dataStore.update("orders", (o) => o.id === order.id, { assignedToWaiter: true });
    push(`Order ${order.id} assigned to you for delivery.`, "success");
  }

  async function deliver(order) {
    await dataStore.update("orders", (o) => o.id === order.id, { status: "completed" });
    socket.emit(SOCKET_EVENTS.FOOD_SERVED, { message: `Order ${order.id} served.` });
    push(`Order ${order.id} marked as delivered.`, "success");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">My Orders</h1>
        <p className="text-sm text-ink-400">Receive ready orders from the kitchen and deliver them to the table.</p>
      </div>

      <Section title="Ready Orders" icon={PackageCheck} pagination={readyPage}>
        {readyPage.pageItems.map((o) => (
          <Row key={o.id} order={o}>
            <button onClick={() => assign(o)} className="rounded-lg bg-ink-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-900">
              Receive
            </button>
          </Row>
        ))}
        {ready.length === 0 && <Empty text="Nothing waiting for pickup." />}
      </Section>

      <Section title="Assigned Orders" icon={Truck} pagination={assignedPage}>
        {assignedPage.pageItems.map((o) => (
          <Row key={o.id} order={o}>
            <button onClick={() => deliver(o)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
              Mark Delivered
            </button>
          </Row>
        ))}
        {assigned.length === 0 && <Empty text="No orders in your hands right now." />}
      </Section>

      <Section title="Delivered Orders" icon={CheckCircle2} pagination={deliveredPage}>
        {deliveredPage.pageItems.map((o) => (
          <Row key={o.id} order={o} />
        ))}
        {delivered.length === 0 && <Empty text="Nothing delivered yet." />}
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, children, pagination }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
        <Icon size={16} /> {title}
      </h2>
      <div className="space-y-2">{children}</div>
      {pagination && (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={pagination.setPage} />
      )}
    </div>
  );
}

function Row({ order, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-3 text-sm">
      <span className="font-semibold text-ink-800">{order.id}</span>
      <span className="text-ink-500">{order.tableNumber ? `Table ${order.tableNumber}` : "Take Away"}</span>
      <PipelineBadge status={order.status} />
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <p className="py-4 text-center text-sm text-ink-400">{text}</p>;
}