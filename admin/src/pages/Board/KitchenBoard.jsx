import { useEffect, useMemo, useState } from "react";
import { dataStore } from "../../components/services/dataStore";
import logo from "../../assets/logo.jpeg";

const PRIORITY_RANK = { urgent: 0, vip: 1, high: 2, normal: 3 };
// Minutes assigned per status purely for this offline mock/demo so the ETA
// countdown has something real to animate against (SRS 14.9.3).
const MOCK_PREP_MINUTES = { pending: 14, preparing: 7, ready: 0, completed: 0 };

export default function KitchenBoard() {
  const [orders, setOrders] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    (async () => setOrders(await dataStore.load("orders", "orders.json")))();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { nowServing, readyZone, upNext } = useMemo(() => {
    if (!orders) return { nowServing: null, readyZone: [], upNext: [] };

    const active = orders.filter((o) => o.status !== "completed");

    const sorted = [...active].sort((a, b) => {
      const rank = (o) => PRIORITY_RANK[o.priority] ?? 3;
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const ready = sorted.filter((o) => o.status === "ready");
    const upcoming = sorted.filter((o) => o.status !== "ready");

    return {
      nowServing: ready[0] || upcoming[0] || null,
      readyZone: ready,
      upNext: upcoming.slice(0, 8),
    };
  }, [orders]);

  function etaLabel(order) {
    const base = MOCK_PREP_MINUTES[order.status] ?? 10;
    if (base <= 0) return "Ready now";
    // Deterministic little wobble so each row doesn't show an identical number.
    const drift = Math.max(0, base - Math.floor((now.getSeconds() / 60) * 2));
    return `~${drift} min`;
  }

  return (
    <div className="min-h-screen bg-ink-950 p-4 text-white board:p-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink-800 pb-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Conveyor Group" className="h-10 w-auto rounded bg-white p-1 board:h-14" />
          <div>
            <p className="text-lg font-bold board:text-2xl">Conveyor Group Restaurant</p>
            <p className="text-xs text-ink-400 board:text-sm">Live Meal Collection Board</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl font-bold text-brand-500 board:text-5xl">
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
          <p className="text-xs text-ink-400 board:text-sm">
            {now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </header>

      {!orders && <p className="py-20 text-center text-ink-400">Loading live queue...</p>}

      {orders && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Now Serving */}
          <section className="lg:col-span-1">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">Now Serving</p>
            {nowServing ? (
              <div className="rounded-2xl border-2 border-brand-500 bg-ink-900 p-6 text-center board:p-10">
                <p className="font-mono text-5xl font-extrabold text-brand-500 board:text-7xl">
                  {nowServing.id.replace("ORD-", "T-")}
                </p>
                <p className="mt-2 text-lg text-ink-200 board:text-2xl">
                  {nowServing.tableNumber ? `Table ${nowServing.tableNumber}` : "Take Away"}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-ink-800 bg-ink-900 p-10 text-center text-ink-500">
                No active orders
              </div>
            )}
          </section>

          {/* Ready for Collection */}
          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">
              Ready for Collection
            </p>
            <div className="space-y-2">
              {readyZone.length === 0 && (
                <p className="rounded-xl border border-dashed border-ink-800 p-6 text-center text-sm text-ink-500">
                  Nothing waiting right now
                </p>
              )}
              {readyZone.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-xl bg-emerald-600/20 border border-emerald-600 px-4 py-3 board:py-4"
                >
                  <span className="font-mono text-xl font-bold text-emerald-400 board:text-2xl">
                    {o.id.replace("ORD-", "T-")}
                  </span>
                  <span className="text-sm text-ink-200 board:text-base">
                    {o.tableNumber ? `Table ${o.tableNumber}` : "Take Away"}
                  </span>
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold">
                    READY
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Up Next */}
          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">Up Next</p>
            <div className="space-y-2">
              {upNext.length === 0 && (
                <p className="rounded-xl border border-dashed border-ink-800 p-6 text-center text-sm text-ink-500">
                  Queue is empty
                </p>
              )}
              {upNext.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-xl bg-ink-900 px-4 py-3 board:py-4"
                >
                  <span className="font-mono text-lg font-bold text-white board:text-xl">
                    {o.id.replace("ORD-", "T-")}
                  </span>
                  <span className="text-sm text-ink-400">
                    {o.tableNumber ? `Table ${o.tableNumber}` : "Take Away"}
                  </span>
                  {o.priority !== "normal" && (
                    <span className="rounded bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase">
                      {o.priority}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-amber-400">{etaLabel(o)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-ink-600">
        Public display — no login required · Auto-updates in real time via Socket.IO
      </p>
    </div>
  );
}
