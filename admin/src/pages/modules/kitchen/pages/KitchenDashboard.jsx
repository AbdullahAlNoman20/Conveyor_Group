import {
  ClipboardList,
  Clock,
  ChefHat,
  CheckCircle2,
  Utensils,
} from "lucide-react";
import StatCard from "../../../../components/shared/StatCard";
import { PipelineBadge } from "../../../../components/shared/OrderPipeline";
import Loader from "../../../../components/shared/Loader";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";

const PRIORITY_RANK = { urgent: 0, vip: 1, high: 2, normal: 3 };

export default function KitchenDashboard() {
  const orders = useLiveCollection("orders", "orders.json");

  if (!orders) return <Loader full label="Loading kitchen queue..." />;

  // Orders still waiting on Manager approval haven't reached the kitchen yet.
  const kitchenOrders = orders.filter((o) => o.status !== "awaiting_manager");

  const pending = kitchenOrders.filter((o) => o.status === "pending").length;
  const preparing = kitchenOrders.filter((o) => o.status === "preparing").length;
  const ready = kitchenOrders.filter((o) => o.status === "ready").length;
  const completed = kitchenOrders.filter((o) => o.status === "completed").length;

  const queue = kitchenOrders
    .filter((o) => o.status !== "completed" && o.status !== "cancelled")
    .sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 3) -
        (PRIORITY_RANK[b.priority] ?? 3)
    );

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Utensils size={21} />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
              Kitchen Dashboard
            </h1>
            <p className="mt-1 text-xs leading-5 text-ink-400 sm:text-sm">
              First-in, first-out — adjusted by priority. Updates live.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Pending"
          value={pending}
          Icon={ClipboardList}
          accent="amber"
        />

        <StatCard
          label="Preparing"
          value={preparing}
          Icon={Clock}
          accent="amber"
        />

        <StatCard
          label="Ready"
          value={ready}
          Icon={ChefHat}
          accent="emerald"
        />

        <StatCard
          label="Completed"
          value={completed}
          Icon={CheckCircle2}
          accent="ink"
        />
      </div>

      {/* Queue */}
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
        {/* Queue Header */}
        <div className="border-b border-ink-100 bg-ink-50/70 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink-800 sm:text-base">
                Live Queue
              </h2>
              <p className="mt-0.5 text-xs text-ink-400">
                FIFO + Priority
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-medium text-ink-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live updates
            </div>
          </div>
        </div>

        {/* Desktop / Tablet Table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-ink-100">
              <tr className="text-xs uppercase tracking-wide text-ink-400">
                <th className="w-[18%] px-5 py-3.5 font-semibold">
                  Order
                </th>

                <th className="w-[20%] px-5 py-3.5 font-semibold">
                  Client
                </th>

                <th className="w-[32%] px-5 py-3.5 font-semibold">
                  Items
                </th>

                <th className="w-[15%] px-5 py-3.5 font-semibold">
                  Priority
                </th>

                <th className="w-[15%] px-5 py-3.5 font-semibold">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {queue.map((o) => (
                <tr
                  key={o.id}
                  className="transition hover:bg-ink-50/40"
                >
                  {/* Order */}
                  <td className="px-5 py-4">
                    <p className="font-semibold text-ink-800">
                      {o.id}
                    </p>
                  </td>

                  {/* Client */}
                  <td className="px-5 py-4">
                    <p className="font-medium text-ink-700">
                      {o.clientName}
                    </p>
                  </td>

                  {/* Items */}
                  <td className="px-5 py-4">
                    <p className="leading-5 text-ink-500">
                      {o.items
                        .map((i) => `${i.qty}x ${i.name}`)
                        .join(", ")}
                    </p>
                  </td>

                  {/* Priority */}
                  <td className="px-5 py-4">
                    {o.priority !== "normal" ? (
                      <span className="inline-flex rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold uppercase text-brand-700">
                        {o.priority}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-300">
                        Normal
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <PipelineBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 p-3 sm:hidden">
          {queue.map((o) => (
            <div
              key={o.id}
              className="overflow-hidden rounded-xl border border-ink-100 bg-white"
            >
              {/* Order / Status */}
              <div className="flex items-start justify-between gap-3 border-b border-ink-100 bg-ink-50/50 p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink-800">
                    {o.id}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-ink-400">
                    {o.clientName}
                  </p>
                </div>

                <div className="shrink-0">
                  <PipelineBadge status={o.status} />
                </div>
              </div>

              {/* Items */}
              <div className="p-3.5">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  Items
                </p>

                <p className="text-sm leading-5 text-ink-600">
                  {o.items
                    .map((i) => `${i.qty}x ${i.name}`)
                    .join(", ")}
                </p>

                {/* Bottom details */}
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink-100 pt-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                      Priority
                    </p>

                    <div className="mt-1">
                      {o.priority !== "normal" ? (
                        <span className="inline-flex rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-bold uppercase text-brand-700">
                          {o.priority}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-ink-400">
                          Normal
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                      Queue
                    </p>

                    <p className="mt-1 text-xs font-semibold text-ink-600">
                      Active
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {queue.length === 0 && (
            <div className="rounded-xl border border-dashed border-ink-200 px-4 py-10 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ink-50 text-ink-300">
                <ChefHat size={20} />
              </div>

              <p className="mt-3 text-sm font-medium text-ink-600">
                Queue is empty. Nice work!
              </p>
            </div>
          )}
        </div>

        {/* Desktop Empty State */}
        {queue.length === 0 && (
          <div className="hidden px-5 py-12 text-center sm:block">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ink-50 text-ink-300">
              <ChefHat size={20} />
            </div>

            <p className="mt-3 text-sm font-medium text-ink-600">
              Queue is empty. Nice work!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}