import { useEffect, useState } from "react";
import { dataStore } from "../../../../components/services/dataStore";
import { useAuth } from "../../../../components/hooks/useAuth";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import SearchInput from "../../../../components/shared/SearchInput";

export default function ClientOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => setOrders(await dataStore.load("orders", "orders.json")))();
  }, []);

  if (!orders) return <Loader full label="Loading your orders..." />;

  const mine = orders.filter(
    (o) => o.clientName?.toLowerCase().includes(user?.name?.toLowerCase().split(" ")[0] || "")
  );
  const list = query
    ? mine.filter((o) => o.id.toLowerCase().includes(query.toLowerCase()))
    : mine;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Order History</h1>
          <p className="text-sm text-ink-400">All your past and current orders.</p>
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search order number..." />
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
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {list.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 text-ink-500">
                  {new Date(o.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 font-semibold text-ink-800">{o.id}</td>
                <td className="px-4 py-3 text-ink-500">
                  {o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                </td>
                <td className="px-4 py-3 font-semibold text-ink-900">\u09F3{o.amount}</td>
                <td className="px-4 py-3">
                  <Badge tone={o.status}>{o.status}</Badge>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-400">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
