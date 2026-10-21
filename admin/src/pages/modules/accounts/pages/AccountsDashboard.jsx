// admin/src/pages/modules/accounts/pages/AccountsDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList, Receipt, Calculator, Package, AlertTriangle, ArrowRight,
} from "lucide-react";
import { apiGet } from "../../../../components/services/api";
import { dataStore } from "../../../../components/services/dataStore";
import Loader from "../../../../components/shared/Loader";
import { useAuth } from "../../../../components/hooks/useAuth";

const BASE = "/app/accounts";
const tk = (n) => `Tk ${Number(n || 0).toLocaleString()}`;

export default function AccountsDashboard() {
  const { user } = useAuth();

  const [daily, setDaily] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      const [cost, stock] = await Promise.all([
        apiGet("/kitchen/costs/daily").catch(() => null),
        apiGet("/kitchen/items").catch(() => []),
      ]);
      if (!mounted) return;
      setDaily(cost);
      setItems(stock);
      setLoading(false);
    }

    refresh();
    const unsub = dataStore.subscribe("inventory", refresh);
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  if (loading) return <Loader full label="Loading..." />;

  const stockValue = items.reduce((s, i) => s + i.stockValue, 0);
  const lowStock = items.filter((i) => i.lowStock);
  const profit = daily?.marginPerMeal ?? 0;
  const cooked = daily?.peopleCookedFor ?? 0;

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
          Welcome, {user?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-ink-500">Today at a glance.</p>
      </div>

      {/* Today's answer, in one card instead of four scattered numbers. */}
      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-700">Today's food cost</h2>

        {cooked === 0 ? (
          <p className="mt-3 rounded-lg bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
            Nothing cooked yet today.
          </p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Box label="Food used" value={tk(daily.totalCost)} />
              <Box label="People ate" value={cooked} />
              <Box label="Cost of 1 meal" value={tk(daily.costPerMeal)} strong />
              <Box
                label={profit >= 0 ? "You keep" : "You lose"}
                value={tk(Math.abs(profit))}
                tone={profit >= 0 ? "good" : "bad"}
              />
            </div>

            <p
              className={`mt-3 rounded-lg px-3 py-2.5 text-sm leading-6 ${
                profit >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
              }`}
            >
              {profit >= 0
                ? `You charge ${tk(daily.chargedPerMeal)} and it costs ${tk(daily.costPerMeal)}. You keep ${tk(daily.totalMargin)} today.`
                : `You charge ${tk(daily.chargedPerMeal)} but it costs ${tk(daily.costPerMeal)}. The company paid ${tk(Math.abs(daily.totalMargin))} extra today.`}
            </p>
          </>
        )}

        <Link
          to={`${BASE}/kitchen/costs`}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
        >
          See full report <ArrowRight size={13} />
        </Link>
      </section>

      {/* Store room */}
      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-700">Store room</h2>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Box label="Stock value" value={tk(stockValue)} />
          <Box
            label="Running low"
            value={lowStock.length}
            tone={lowStock.length > 0 ? "bad" : "good"}
          />
        </div>

        {lowStock.length > 0 && (
          <Link
            to={`${BASE}/kitchen/inventory`}
            className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800 transition hover:bg-amber-100"
          >
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>
              Buy soon, {lowStock.map((i) => `${i.name} (${i.currentQty} ${i.unit} left)`).join(", ")}.
            </span>
          </Link>
        )}
      </section>

      {/* Shortcuts */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [`${BASE}/kitchen/shopping-list`, "Shopping List", "Plan what to buy", ClipboardList],
          [`${BASE}/kitchen/purchases`, "Add Purchase", "Voucher and prices", Receipt],
          [`${BASE}/kitchen/inventory`, "Store Room", "Stock and daily use", Package],
        ].map(([to, title, subtitle, Icon]) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white px-4 py-4 transition hover:border-brand-300 hover:bg-brand-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-white">
              <Icon size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-ink-900">{title}</span>
              <span className="block text-xs text-ink-500">{subtitle}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Box({ label, value, strong, tone }) {
  const color =
    tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-brand-600" : "text-ink-900";
  return (
    <div
      className={`rounded-xl border p-3 ${
        strong ? "border-brand-200 bg-brand-50" : "border-ink-100 bg-ink-50"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${strong ? "text-brand-700" : color}`}>{value}</p>
    </div>
  );
}