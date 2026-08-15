// FILE: src/pages/modules/guest/pages/GuestOrders.jsx
import { useEffect, useState } from "react";
import { ClipboardList, ReceiptText } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Pagination, {
  usePagination,
} from "../../../../components/shared/Pagination";

export default function GuestOrders() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    (async () => setOrders(await dataStore.load("orders", "orders.json")))();
  }, []);

  const mine = (orders || []).filter((o) =>
    o.clientName?.toLowerCase().startsWith("guest")
  );

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedMine,
  } = usePagination(mine, 10);

  if (!orders) return <Loader full label="Loading your orders..." />;

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <ClipboardList size={21} />
          </div>

          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
              Active Orders
            </h1>

            <p className="mt-1 text-xs leading-5 text-ink-400 sm:text-sm">
              Orders placed for you during this visit.
            </p>
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="min-w-0 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
        {/* Desktop Table Header */}
        <div className="hidden border-b border-ink-100 bg-ink-50/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-400 sm:grid sm:grid-cols-[130px_minmax(0,1fr)_110px_130px] sm:items-center sm:gap-4">
          <span>Order</span>
          <span>Items</span>
          <span>Amount</span>
          <span className="text-right">Status</span>
        </div>

        <div className="divide-y divide-ink-100">
          {pagedMine.map((o) => (
            <div
              key={o.id}
              className="min-w-0 px-4 py-4 transition hover:bg-ink-50/40 sm:px-4"
            >
              {/* Desktop Row */}
              <div className="hidden min-w-0 grid-cols-[130px_minmax(0,1fr)_110px_130px] items-center gap-4 sm:grid">
                {/* Order ID */}
                <div className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink-900">
                    {o.id}
                  </span>
                </div>

                {/* Items */}
                <div className="min-w-0 overflow-hidden">
                  <span className="block truncate text-sm text-ink-600">
                    {o.items
                      ?.map((i) => `${i.qty}x ${i.name}`)
                      .join(", ") || "No items"}
                  </span>
                </div>

                {/* Amount */}
                <div className="min-w-0">
                  <span className="whitespace-nowrap text-sm font-bold text-ink-900">
                    Tk {o.amount}
                  </span>
                </div>

                {/* Status */}
                <div className="flex min-w-0 justify-end">
                  <Badge tone={o.status}>{o.status}</Badge>
                </div>
              </div>

              {/* Mobile Card */}
              <div className="min-w-0 sm:hidden">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  {/* Order ID */}
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-400">
                      <ReceiptText size={16} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                        Order
                      </p>

                      <p className="truncate text-sm font-bold text-ink-900">
                        {o.id}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    <Badge tone={o.status}>{o.status}</Badge>
                  </div>
                </div>

                {/* Items */}
                <div className="mt-4 min-w-0 rounded-xl bg-ink-50/60 p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                    Items
                  </p>

                  <p className="break-words text-sm leading-5 text-ink-600">
                    {o.items
                      ?.map((i) => `${i.qty}x ${i.name}`)
                      .join(", ") || "No items"}
                  </p>
                </div>

                {/* Amount */}
                <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
                  <span className="text-xs font-medium text-ink-400">
                    Total Amount
                  </span>

                  <span className="text-base font-bold text-ink-900">
                    Tk {o.amount}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {mine.length === 0 && (
            <div className="px-4 py-12 text-center sm:py-14">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-50 text-ink-300">
                <ClipboardList size={20} />
              </div>

              <p className="mt-3 text-sm font-medium text-ink-500">
                No active orders right now.
              </p>

              <p className="mt-1 text-xs text-ink-400">
                Your orders will appear here once you place one.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="border-t border-ink-100 p-3 sm:p-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}