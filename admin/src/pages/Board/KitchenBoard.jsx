// admin/src/pages/Board/KitchenBoard.jsx
import { useEffect, useState } from "react";
import { apiGet } from "../../components/services/api";
import { socket } from "../../components/services/dataStore";
import AvatarImage from "../../components/shared/AvatarImage";
import Footer from "../../components/Footer";
import logo from "../../assets/logo.jpeg";

export default function KitchenBoard() {
  // The board hangs on a counter TV with no login, so it reads the public
  // projection (names + photos only — no employee IDs, amounts or departments)
  // instead of the authenticated orders/clients collections.
  const [queue, setQueue] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      try {
        const data = await apiGet("/public/board");
        if (mounted) setQueue(data);
      } catch {
        if (mounted) setQueue((prev) => prev ?? []);
      }
    }

    refresh();

    // Pushed by the server whenever an order changes — no polling.
    const onChange = ({ collection }) => {
      if (collection === "orders") refresh();
    };
    socket.on("data:changed", onChange);

    // Safety net in case a socket event is missed while the TV sleeps.
    const poll = setInterval(refresh, 30000);

    return () => {
      mounted = false;
      socket.off("data:changed", onChange);
      clearInterval(poll);
    };
  }, []);

  const servingNow = queue?.slice(0, 5) ?? [];
  const readyZone = queue?.slice(5, 10) ?? [];
  const upNext = queue?.slice(10, 15) ?? [];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-ink-950 text-white">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/videos/hero_bg.webm"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-ink-950/85" />

      <div className="relative flex-1 p-4 board:p-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink-800 pb-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Conveyor Group"
              className="h-10 w-auto rounded bg-white p-1 board:h-14"
            />
            <div>
              <p className="text-lg font-bold board:text-2xl">
                Conveyor Group Restaurant
              </p>
              <p className="text-xs text-ink-400 board:text-sm">
                Live Meal Collection Board
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold text-brand-500 sm:text-3xl board:text-5xl">
              {now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
            <p className="text-xs text-ink-400 board:text-sm">
              {now.toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </header>

        {!queue && (
          <p className="py-20 text-center text-ink-400">Loading live queue...</p>
        )}

        {queue && (
          <div className="grid gap-6 lg:grid-cols-3 lg:items-start lg:justify-items-center">
            <section className="w-full max-w-md lg:col-span-1">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">
                Serving Now
              </p>
              <div className="space-y-2">
                {servingNow.length === 0 && (
                  <div className="rounded-2xl border border-ink-800 bg-ink-900 p-10 text-center text-ink-500">
                    No active orders
                  </div>
                )}
                {servingNow.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center gap-3 rounded-2xl border-2 border-brand-500 bg-ink-900 p-4 board:p-6"
                  >
                    <AvatarImage
                      name={o.clientName}
                      photo={o.photo}
                      size={56}
                      className="shrink-0 border-2 border-brand-500 board:h-16 board:w-16"
                    />
                    <span className="min-w-0 flex-1 truncate text-xl font-extrabold text-white board:text-2xl">
                      {o.clientName}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="w-full max-w-md">
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
                    className="flex items-center gap-3 rounded-xl border border-emerald-600 bg-emerald-600/20 px-4 py-3 board:py-4"
                  >
                    <AvatarImage
                      name={o.clientName}
                      photo={o.photo}
                      size={36}
                      className="shrink-0 border border-emerald-500 board:h-11 board:w-11"
                    />
                    <span className="min-w-0 flex-1 truncate text-lg font-bold text-emerald-100 board:text-xl">
                      {o.clientName}
                    </span>
                    <span className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold">
                      READY
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="w-full max-w-md">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">
                Up Next
              </p>
              <div className="space-y-2">
                {upNext.length === 0 && (
                  <p className="rounded-xl border border-dashed border-ink-800 p-6 text-center text-sm text-ink-500">
                    Queue is empty
                  </p>
                )}
                {upNext.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center gap-3 rounded-xl bg-ink-900 px-4 py-3 board:py-4"
                  >
                    <AvatarImage
                      name={o.clientName}
                      photo={o.photo}
                      size={32}
                      className="shrink-0 board:h-10 board:w-10"
                    />
                    <span className="min-w-0 flex-1 truncate text-base font-bold text-white board:text-lg">
                      {o.clientName}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}