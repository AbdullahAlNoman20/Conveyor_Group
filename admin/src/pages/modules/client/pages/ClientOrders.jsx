// FILE: src/pages/modules/client/pages/ClientOrders.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, FileSpreadsheet } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useAuth } from "../../../../components/hooks/useAuth";
import { exportToExcel } from "../../../../components/utils/exportExcel";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import SearchInput from "../../../../components/shared/SearchInput";
import Pagination, {
  usePagination,
} from "../../../../components/shared/Pagination";

export default function ClientOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => setOrders(await dataStore.load("orders", "orders.json")))();
  }, []);

  const mine = (orders || []).filter((o) =>
    o.clientName
      ?.toLowerCase()
      .includes(user?.name?.toLowerCase().split(" ")[0] || ""),
  );
  const list = query
    ? mine.filter((o) => o.id.toLowerCase().includes(query.toLowerCase()))
    : mine;
  const sorted = [...list].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedList,
  } = usePagination(sorted, 10);

  if (!orders) return <Loader full label="Loading your orders..." />;

  function downloadMonthlyExcel() {
    const now = new Date();
    const thisMonth = mine.filter((o) => {
      const d = new Date(o.createdAt);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
    if (thisMonth.length === 0) return;
    exportToExcel(
      thisMonth.map((o) => ({
        "Order Number": o.id,
        Date: new Date(o.createdAt).toLocaleDateString(),
        Items: o.items?.map((i) => `${i.qty}x ${i.name}`).join(", "),
        "Amount (Tk)": o.amount,
        Status: o.status,
      })),
      `my-orders-${now.getFullYear()}-${now.getMonth() + 1}`,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Order History</h1>
          <p className="text-sm text-ink-400">
            All your past and current orders.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search order number..."
          />
          <button
            onClick={downloadMonthlyExcel}
            className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
          >
            <FileSpreadsheet size={14} /> This Month (Excel)
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-ink-100 bg-white sm:block">
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
              <tr key={o.id} className="hover:bg-ink-50/60">
                <td className="px-4 py-3 text-ink-500">
                  {new Date(o.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 font-semibold text-ink-800">{o.id}</td>
                <td className="px-4 py-3 text-ink-500">
                  {o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                </td>
                <td className="px-4 py-3 font-semibold text-ink-900">
                  Tk {o.amount}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={o.status}>{o.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => navigate(`/app/client/orders/${o.id}`)}
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
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          className="px-4 pb-3"
        />
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {pagedList.map((o) => (
          <button
            key={o.id}
            onClick={() => navigate(`/app/client/orders/${o.id}`)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-4 text-left"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-ink-900">{o.id}</p>
                <Badge tone={o.status}>{o.status}</Badge>
              </div>
              <p className="mt-1 truncate text-xs text-ink-400">
                {o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                {new Date(o.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-bold text-ink-900">Tk {o.amount}</p>
              <Eye size={14} className="ml-auto mt-1 text-ink-400" />
            </div>
          </button>
        ))}
        {list.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
            No orders found.
          </p>
        )}
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
