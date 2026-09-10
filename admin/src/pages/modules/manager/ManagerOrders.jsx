// admin/src/pages/modules/manager/pages/ManagerOrders.jsx
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  ChefHat,
  Flame,
  BellRing,
  PackageCheck,
  Clock,
} from "lucide-react";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { apiPatch } from "../../../../components/services/api";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import Badge from "../../../../components/shared/Badge";
import Loader from "../../../../components/shared/Loader";
import AvatarImage from "../../../../components/shared/AvatarImage";

/**
 * The order lifecycle had no UI at all: clients could submit orders but no
 * screen ever called PATCH /orders/:id/status, so every order sat at
 * "awaiting_manager" and never reached the token board.
 *
 * Each entry is the ONE next status this order can move to, matching the
 * server's TRANSITIONS map exactly. An illegal jump is rejected server-side.
 */
const NEXT_STEP = {
  awaiting_manager: { to: "pending", label: "Approve", Icon: CheckCircle2, tone: "primary" },
  pending: { to: "accepted", label: "Kitchen Accept", Icon: ChefHat, tone: "primary" },
  accepted: { to: "preparing", label: "Start Preparing", Icon: Flame, tone: "primary" },
  preparing: { to: "ready", label: "Mark Ready", Icon: BellRing, tone: "primary" },
  delayed: { to: "ready", label: "Mark Ready", Icon: BellRing, tone: "primary" },
  ready: { to: "completed", label: "Collected", Icon: PackageCheck, tone: "success" },
};

const REJECTABLE = new Set(["awaiting_manager", "pending"]);
const CANCELLABLE = new Set(["awaiting_manager", "pending", "accepted", "preparing", "delayed"]);

const TABS = [
  ["active", "Active"],
  ["ready", "Ready"],
  ["completed", "Completed"],
  ["all", "All"],
];

const ACTIVE_STATUSES = ["awaiting_manager", "pending", "accepted", "preparing", "delayed"];

export default function ManagerOrders() {
  const orders = useLiveCollection("orders");
  const { push } = useToast();
  const [tab, setTab] = useState("active");
  const [busyId, setBusyId] = useState(null);

  const todayStr = new Date().toDateString();

  const visible = useMemo(() => {
    if (!orders) return [];
    const todays = orders.filter(
      (o) => new Date(o.createdAt).toDateString() === todayStr,
    );
    const filtered =
      tab === "active"
        ? todays.filter((o) => ACTIVE_STATUSES.includes(o.status))
        : tab === "ready"
          ? todays.filter((o) => o.status === "ready")
          : tab === "completed"
            ? todays.filter((o) => o.status === "completed")
            : todays;

    return filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [orders, tab, todayStr]);

  const counts = useMemo(() => {
    if (!orders) return { awaiting: 0, active: 0, ready: 0 };
    const todays = orders.filter(
      (o) => new Date(o.createdAt).toDateString() === todayStr,
    );
    return {
      awaiting: todays.filter((o) => o.status === "awaiting_manager").length,
      active: todays.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
      ready: todays.filter((o) => o.status === "ready").length,
    };
  }, [orders, todayStr]);

  if (!orders) return <Loader full label="Loading orders..." />;

  async function move(order, nextStatus) {
    setBusyId(order.id);
    try {
      await apiPatch(`/orders/${order.id}/status`, { status: nextStatus });
      // The server broadcasts data:changed, but refresh immediately so the
      // acting manager never sees a stale row.
      await dataStore.load("orders");
      push(`${order.id} → ${nextStatus.replace(/_/g, " ")}`, "success");
    } catch (err) {
      push(err?.message || "Couldn't update this order.", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Today's Orders</h1>
        <p className="mt-1 text-sm text-ink-400">
          {counts.awaiting > 0
            ? `${counts.awaiting} order(s) waiting for your approval.`
            : "Nothing waiting for approval right now."}
        </p>
      </div>

      {/* Tabs */}
      <div className="grid w-full grid-cols-2 gap-1 rounded-lg bg-ink-50 p-1 sm:flex sm:w-fit">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-colors sm:py-2 ${
              tab === key
                ? "bg-white text-brand-700 shadow-sm"
                : "text-ink-500 hover:text-ink-700"
            }`}
          >
            {label}
            {key === "active" && counts.active > 0 && (
              <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
                {counts.active}
              </span>
            )}
            {key === "ready" && counts.ready > 0 && (
              <span className="ml-1.5 rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                {counts.ready}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {visible.map((o) => {
          const step = NEXT_STEP[o.status];
          const busy = busyId === o.id;

          return (
            <div
              key={o.id}
              className="min-w-0 rounded-xl border border-ink-100 bg-white p-4 sm:p-5"
            >
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarImage name={o.clientName} size={40} className="shrink-0" />
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-ink-900">
                        {o.clientName}
                      </p>
                      <Badge tone={o.status}>{o.status.replace(/_/g, " ")}</Badge>
                      {o.instantOrder && (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-700">
                          Instant
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-400">
                      {o.id} ·{" "}
                      {o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400">
                      <Clock size={11} className="shrink-0" />
                      {new Date(o.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {o.tableNumber ? `Table ${o.tableNumber}` : "Take Away"}
                      {" · Tk "}
                      {o.amount}
                    </p>
                  </div>
                </div>

                <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                  {step && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => move(o, step.to)}
                      className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        step.tone === "success"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-brand-600 hover:bg-brand-700"
                      }`}
                    >
                      <step.Icon size={14} className="shrink-0" />
                      {busy ? "..." : step.label}
                    </button>
                  )}

                  {REJECTABLE.has(o.status) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => move(o, "rejected")}
                      className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 disabled:opacity-50"
                    >
                      <XCircle size={14} className="shrink-0" />
                      Reject
                    </button>
                  )}

                  {!REJECTABLE.has(o.status) && CANCELLABLE.has(o.status) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => move(o, "cancelled")}
                      className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 disabled:opacity-50"
                    >
                      <XCircle size={14} className="shrink-0" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink-200 p-10 text-center text-sm text-ink-400">
            No orders in this view.
          </p>
        )}
      </div>
    </div>
  );
}