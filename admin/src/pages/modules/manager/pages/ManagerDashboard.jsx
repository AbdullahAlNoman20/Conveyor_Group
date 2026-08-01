import { ClipboardList, Clock, ChefHat, CheckCircle2, Armchair, Users, UserCheck } from "lucide-react";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import { PipelineBadge } from "../../../../components/shared/OrderPipeline";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { Link } from "react-router-dom";

export default function ManagerDashboard() {
  const orders = useLiveCollection("orders", "orders.json");
  const tables = useLiveCollection("tables", "tables.json");
  const guests = useLiveCollection("guests", "guests.json");

  if (!orders || !tables || !guests) return <Loader full label="Loading dashboard..." />;

  const awaitingApproval = orders.filter((o) => o.status === "awaiting_manager").length;
  const pending = orders.filter((o) => o.status === "pending").length;
  const preparing = orders.filter((o) => o.status === "preparing").length;
  const ready = orders.filter((o) => o.status === "ready").length;
  const completed = orders.filter((o) => o.status === "completed").length;
  const activeTables = tables.filter((t) => t.status !== "free").length;
  const revenue = orders.reduce((s, o) => s + o.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Manager Dashboard</h1>
          <p className="text-sm text-ink-400">Today's operations at a glance — updates live.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/app/manager/scan-qr"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Scan QR
          </Link>
          <Link
            to="/app/manager/new-order"
            className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
          >
            New Order
          </Link>
        </div>
      </div>

      {awaitingApproval > 0 && (
        <Link
          to="/app/manager/order-approvals"
          className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100"
        >
          <span className="flex items-center gap-2">
            <UserCheck size={18} /> {awaitingApproval} client/guest order(s) waiting for your approval
          </span>
          <span className="text-amber-600 underline">Review now</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Awaiting Approval" value={awaitingApproval} Icon={UserCheck} accent="brand" />
        <StatCard label="Pending" value={pending} Icon={ClipboardList} accent="amber" />
        <StatCard label="Preparing" value={preparing} Icon={Clock} accent="amber" />
        <StatCard label="Ready" value={ready} Icon={ChefHat} accent="emerald" />
        <StatCard label="Completed" value={completed} Icon={CheckCircle2} accent="ink" />
        <StatCard label="Active Tables" value={activeTables} Icon={Armchair} accent="sky" />
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">
          Today's Revenue: <span className="text-brand-600">Tk {revenue.toLocaleString()}</span>
        </h2>
        <div className="space-y-2">
          {orders.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-ink-700">{o.clientName}</span>
              <span className="text-ink-400">
                {o.tableNumber ? `Table ${o.tableNumber}` : "Take Away"}
              </span>
              <PipelineBadge status={o.status} />
              <span className="font-semibold text-ink-900">Tk {o.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
