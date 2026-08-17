import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, ReceiptText, Eye, XCircle } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { useToast } from "../../../../components/hooks/useToast";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Modal from "../../../../components/shared/Modal";
import Pagination, {
  usePagination,
} from "../../../../components/shared/Pagination";

const CANCELLABLE_STATUS = "awaiting_manager";

export default function GuestOrders() {
  const { push } = useToast();
  const navigate = useNavigate();
  const orders = useLiveCollection("orders", "orders.json");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const mine = (orders || []).filter((o) =>
    o.clientName?.toLowerCase().startsWith("guest")
  );

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedMine,
  } = usePagination(mine, 10);

  useEffect(() => {
    if (cancelTarget) {
      const latest = (orders || []).find((o) => o.id === cancelTarget.id);
      if (latest && latest.status !== CANCELLABLE_STATUS) {
        push("Manager already accepted this order — it can no longer be cancelled.", "info");
        setCancelTarget(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  if (!orders) return <Loader full label="Loading your orders..." />;

  function canCancel(order) {
    return order.status === CANCELLABLE_STATUS;
  }

  async function confirmCancel() {
    if (!cancelTarget || cancelling) return;
    const latest = (orders || []).find((o) => o.id === cancelTarget.id);
    if (!latest || !canCancel(latest)) {
      push("This order has already been accepted and can no longer be cancelled.", "error");
      setCancelTarget(null);
      return;
    }
    setCancelling(true);
    try {
      await dataStore.update(
        "orders",
        (o) => o.id === cancelTarget.id && o.status === CANCELLABLE_STATUS,
        { status: "cancelled" }
      );
      socket.emit(SOCKET_EVENTS.ORDER_CANCELLED, {
        message: `Order ${cancelTarget.id} was cancelled by the guest.`,
        recipientRoles: ["manager"],
      });
      push("Order cancelled.", "success");
      setCancelTarget(null);
    } catch {
      push("Could not cancel the order. Please try again.", "error");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ClipboardList size={21} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
                Active Orders
              </h1>
              <p className="mt-1 text-xs leading-5 text-ink-400 sm:text-sm">
                Orders placed for you during this visit — updates live.
              </p>
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-1.5 text-xs font-medium text-ink-400 sm:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Live
          </div>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
        <div className="hidden border-b border-ink-100 bg-ink-50/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-400 sm:grid sm:grid-cols-[120px_minmax(0,1fr)_100px_140px_140px] sm:items-center sm:gap-4">
          <span>Order</span>
          <span>Items</span>
          <span>Amount</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="divide-y divide-ink-100">
          {pagedMine.map((o) => (
            <div key={o.id} className="min-w-0 px-4 py-4 transition hover:bg-ink-50/40 sm:px-4">
              <div className="hidden min-w-0 grid-cols-[120px_minmax(0,1fr)_100px_140px_140px] items-center gap-4 sm:grid">
                <div className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink-900">{o.id}</span>
                </div>
                <div className="min-w-0 overflow-hidden">
                  <span className="block truncate text-sm text-ink-600">
                    {o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ") || "No items"}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="whitespace-nowrap text-sm font-bold text-ink-900">Tk {o.amount}</span>
                </div>
                <div className="min-w-0">
                  <Badge tone={o.status}>{o.status}</Badge>
                </div>
                <div className="flex min-w-0 items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/app/guest/orders/${o.id}`)}
                    className="flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:bg-brand-50"
                    title="Monitor order"
                  >
                    <Eye size={13} />
                  </button>
                  {canCancel(o) && (
                    <button
                      type="button"
                      onClick={() => setCancelTarget(o)}
                      className="flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                      title="Cancel order"
                    >
                      <XCircle size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="min-w-0 sm:hidden">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-400">
                      <ReceiptText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Order</p>
                      <p className="truncate text-sm font-bold text-ink-900">{o.id}</p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Badge tone={o.status}>{o.status}</Badge>
                  </div>
                </div>

                <div className="mt-4 min-w-0 rounded-xl bg-ink-50/60 p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">Items</p>
                  <p className="break-words text-sm leading-5 text-ink-600">
                    {o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ") || "No items"}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
                  <span className="text-xs font-medium text-ink-400">Total Amount</span>
                  <span className="text-base font-bold text-ink-900">Tk {o.amount}</span>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/app/guest/orders/${o.id}`)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-200 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                  >
                    <Eye size={13} /> Monitor
                  </button>
                  {canCancel(o) && (
                    <button
                      type="button"
                      onClick={() => setCancelTarget(o)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-brand-200 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                    >
                      <XCircle size={13} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {mine.length === 0 && (
            <div className="px-4 py-12 text-center sm:py-14">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-50 text-ink-300">
                <ClipboardList size={20} />
              </div>
              <p className="mt-3 text-sm font-medium text-ink-500">No active orders right now.</p>
              <p className="mt-1 text-xs text-ink-400">Your orders will appear here once you place one.</p>
            </div>
          )}
        </div>

        <div className="border-t border-ink-100 p-3 sm:p-4">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      <Modal
        open={!!cancelTarget}
        onClose={() => !cancelling && setCancelTarget(null)}
        title="Cancel Order"
        size="sm"
      >
        {cancelTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">
              Cancel order <span className="font-semibold text-ink-900">{cancelTarget.id}</span>?
              This cannot be undone once confirmed. Orders already accepted by the Manager
              can no longer be cancelled.
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
                onClick={() => setCancelTarget(null)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-ink-200 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50"
              >
                Keep Order
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}