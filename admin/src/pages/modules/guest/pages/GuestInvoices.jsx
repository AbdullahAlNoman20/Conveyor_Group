// FILE: src/pages/modules/guest/pages/GuestInvoices.jsx  (MODIFIED, full rewrite)
import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genInvoiceNumber } from "../../../../components/utils/idGenerator";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

export default function GuestInvoices() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    (async () => setOrders(await dataStore.load("orders", "orders.json")))();
  }, []);

  const mine = (orders || []).filter((o) => o.clientName?.toLowerCase().startsWith("guest"));
  const { page, setPage, totalPages, pageItems: pagedMine } = usePagination(mine, 5);

  if (!orders) return <Loader full label="Loading invoice history..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Invoice History</h1>
        
      </div>

      <div className="space-y-3">
        {pagedMine.map((o) => (
          <div key={o.id} className="rounded-xl border border-ink-100 bg-white p-5">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-brand-600" />
              <div>
                <p className="font-semibold text-ink-900">{genInvoiceNumber()}</p>
                <p className="text-xs text-ink-400">{new Date(o.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-between border-t border-ink-100 pt-2 text-sm font-bold text-ink-900">
              <span>Grand Total</span>
              <span>Tk {o.amount}</span>
            </div>
          </div>
        ))}
        {mine.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
            No invoices yet.
          </p>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}