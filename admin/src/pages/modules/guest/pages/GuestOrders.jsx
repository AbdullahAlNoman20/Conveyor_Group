// FILE: src/pages/modules/guest/pages/GuestOrders.jsx  (MODIFIED, full rewrite)
import { useEffect, useState } from "react";
import { dataStore } from "../../../../components/services/dataStore";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

export default function GuestOrders() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    (async () => setOrders(await dataStore.load("orders", "orders.json")))();
  }, []);

  const mine = (orders || []).filter((o) => o.clientName?.toLowerCase().startsWith("guest"));
  const { page, setPage, totalPages, pageItems: pagedMine } = usePagination(mine, 10);

  if (!orders) return <Loader full label="Loading your orders..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Active Orders</h1>
        <p className="text-sm text-ink-400">Orders placed for you during this visit.</p>
      </div>

      <div className="space-y-2">
        {pagedMine.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 bg-white p-4 text-sm">
            <span className="font-semibold text-ink-900">{o.id}</span>
            <span className="text-ink-500">
              {o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}
            </span>
            <span className="font-semibold text-ink-900">Tk {o.amount}</span>
            <Badge tone={o.status}>{o.status}</Badge>
          </div>
        ))}
        {mine.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
            No active orders right now.
          </p>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}