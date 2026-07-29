import { useEffect, useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";

export default function ManagerReports() {
  const { push } = useToast();
  const [orders, setOrders] = useState(null);
  const [guests, setGuests] = useState(null);

  useEffect(() => {
    (async () => {
      setOrders(await dataStore.load("orders", "orders.json"));
      setGuests(await dataStore.load("guests", "guests.json"));
    })();
  }, []);

  if (!orders || !guests) return <Loader full label="Loading reports..." />;

  const revenue = orders.reduce((s, o) => s + o.amount, 0);
  const completed = orders.filter((o) => o.status === "completed").length;
  const clientOrders = orders.filter((o) => !o.clientName?.startsWith("Guest")).length;
  const guestOrders = orders.length - clientOrders;

  function exportAs(format) {
    push(`${format} export queued (mock).`, "info");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Daily Reports</h1>
          <p className="text-sm text-ink-400">Restaurant-level snapshot for today (SRS §24.1).</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportAs("Excel")} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold hover:bg-ink-50">
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button onClick={() => exportAs("PDF")} className="flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold hover:bg-ink-50">
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Daily Orders" value={orders.length} accent="ink" />
        <StatCard label="Daily Revenue" value={`\u09F3${revenue.toLocaleString()}`} accent="brand" />
        <StatCard label="Daily Guests" value={guests.length} accent="amber" />
        <StatCard label="Completed" value={completed} accent="emerald" />
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Guest vs Client Orders</h2>
        <div className="flex h-4 overflow-hidden rounded-full bg-ink-100">
          <div
            className="bg-brand-600"
            style={{ width: `${(clientOrders / (orders.length || 1)) * 100}%` }}
          />
          <div
            className="bg-ink-400"
            style={{ width: `${(guestOrders / (orders.length || 1)) * 100}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-ink-500">
          <span>Client: {clientOrders}</span>
          <span>Guest: {guestOrders}</span>
        </div>
      </div>
    </div>
  );
}
