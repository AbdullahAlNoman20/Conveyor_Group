// FILE: src/pages/modules/client/pages/ClientOrders.jsx (FULL REWRITE — Excel export + eye/print detail)
import { useEffect, useState } from "react";
import { Eye, FileSpreadsheet, Printer } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useAuth } from "../../../../components/hooks/useAuth";
import { exportToExcel } from "../../../../components/utils/exportExcel";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import SearchInput from "../../../../components/shared/SearchInput";
import Modal from "../../../../components/shared/Modal";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";

export default function ClientOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState(null);
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    (async () => setOrders(await dataStore.load("orders", "orders.json")))();
  }, []);

  const mine = (orders || []).filter(
    (o) => o.clientName?.toLowerCase().includes(user?.name?.toLowerCase().split(" ")[0] || "")
  );
  const list = query
    ? mine.filter((o) => o.id.toLowerCase().includes(query.toLowerCase()))
    : mine;
  const { page, setPage, totalPages, pageItems: pagedList } = usePagination(list, 10);

  if (!orders) return <Loader full label="Loading your orders..." />;

  function downloadMonthlyExcel() {
    const now = new Date();
    const thisMonth = mine.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    if (thisMonth.length === 0) {
      return;
    }
    exportToExcel(
      thisMonth.map((o) => ({
        "Order Number": o.id,
        Date: new Date(o.createdAt).toLocaleDateString(),
        Items: o.items?.map((i) => `${i.qty}x ${i.name}`).join(", "),
        "Amount (Tk)": o.amount,
        Status: o.status,
      })),
      `my-orders-${now.getFullYear()}-${now.getMonth() + 1}`
    );
  }

  function printOrder(o) {
    printOnLetterhead({
      title: `Order ${o.id}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Order Receipt</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">${o.id} · ${new Date(o.createdAt).toLocaleString()}</p>
        <div class="row"><span class="label">Customer</span><span>${o.clientName}</span></div>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
          <tbody>
            ${(o.items || []).map((i) => `<tr><td>${i.name}</td><td>${i.qty}</td><td>Tk ${i.qty * i.unitPrice}</td></tr>`).join("")}
          </tbody>
        </table>
        <div class="row total"><span>Total</span><span>Tk ${o.amount}</span></div>
      `,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Order History</h1>
          <p className="text-sm text-ink-400">All your past and current orders.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Search order number..." />
          <button
            onClick={downloadMonthlyExcel}
            className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
          >
            <FileSpreadsheet size={14} /> This Month (Excel)
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-400">
            <tr>
              <th className="px-4 py-3">Order Date</th>
              <th className="px-4 py-3">Order Number</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {pagedList.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 text-ink-500">
                  {new Date(o.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 font-semibold text-ink-800">{o.id}</td>
                <td className="px-4 py-3 text-ink-500">
                  {o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                </td>
                <td className="px-4 py-3 font-semibold text-ink-900">Tk {o.amount}</td>
                <td className="px-4 py-3">
                  <Badge tone={o.status}>{o.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setViewing(o)}
                    className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"
                    title="View Details"
                  >
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-400">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-4 pb-3" />
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.id || "Order Details"} size="sm">
        {viewing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
              <span className="text-ink-400">Date</span>
              <span className="font-medium text-ink-800">{new Date(viewing.createdAt).toLocaleString()}</span>
            </div>
            <div className="space-y-1">
              {(viewing.items || []).map((i, idx) => (
                <div key={idx} className="flex justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
                  <span className="text-ink-600">{i.qty}x {i.name}</span>
                  <span className="font-medium text-ink-800">Tk {i.qty * i.unitPrice}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-ink-100 pt-3 text-base font-bold text-ink-900">
              <span>Total</span>
              <span>Tk {viewing.amount}</span>
            </div>
            <button
              onClick={() => printOrder(viewing)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Printer size={16} /> Print Receipt
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}