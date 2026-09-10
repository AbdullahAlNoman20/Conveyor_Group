// admin/src/pages/modules/client/pages/PlaceOrder.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Lock, Store, ShoppingBag } from "lucide-react";
import { apiGet, apiPost } from "../../../../components/services/api";
import { useToast } from "../../../../components/hooks/useToast";
import Loader from "../../../../components/shared/Loader";
import DishImage from "../../../../components/shared/DishImage";

export default function PlaceOrder() {
  const { push } = useToast();
  const navigate = useNavigate();

  const [meal, setMeal] = useState(null);
  const [alreadyOrderedToday, setAlreadyOrderedToday] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [collectionType, setCollectionType] = useState("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Only two calls, both allowed for the client role. The old version
        // fetched the whole client list, which a client can't read (403).
        const [fixedMeal, dashboard] = await Promise.all([
          apiGet("/orders/meta/todays-fixed-meal"),
          apiGet("/reports/dashboard"),
        ]);
        if (!mounted) return;
        setMeal(fixedMeal);
        setAlreadyOrderedToday(dashboard.spend.todayOrders > 0);
      } catch (err) {
        if (mounted) setLoadError(err?.message || "Couldn't load today's meal.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function submit(e) {
    e.preventDefault();

    if (collectionType === "dine_in" && !tableNumber.trim()) {
      push("Please enter your table number.", "error");
      return;
    }

    setSubmitting(true);
    try {
      // The server picks the dish, the price and reserves the meal slot.
      // Nothing money-related is trusted from the browser.
      const order = await apiPost("/orders", {
        collectionType,
        tableNumber: collectionType === "dine_in" ? Number(tableNumber) : null,
      });
      push("Order confirmed — check the collection board!", "success");
      navigate(`/app/client/order-confirmation/${order.id}`);
    } catch (err) {
      push(err?.message || "Couldn't place your order.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loader full label="Loading today's meal..." />;

  if (loadError || !meal) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Place Order</h1>
        <p className="rounded-xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400 sm:p-10">
          {loadError || "No fixed meal is set for today. Please contact the Manager."}
        </p>
      </div>
    );
  }

  const canSubmit = !alreadyOrderedToday && !submitting;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Place Order</h1>
        <p className="text-sm text-ink-400">
          Order today's fixed meal — it's confirmed instantly and your name goes
          straight to the collection board.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="space-y-5 sm:space-y-6 lg:col-span-2">
          {/* Today's fixed meal */}
          <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
              <Lock size={14} /> Today's Fixed Meal ({meal.day})
            </h2>

            <div className="flex min-w-0 items-center gap-3 overflow-hidden rounded-xl bg-ink-50 p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm sm:h-16 sm:w-16">
                <DishImage
                  name={meal.name}
                  className="h-full w-full object-cover"
                  rounded="rounded-xl"
                  height={64}
                />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-ink-800">{meal.name}</p>
                <p className="mt-1 text-xs text-ink-400">Today's Fixed Meal</p>
              </div>
              <span className="shrink-0 whitespace-nowrap rounded-lg bg-white px-2 py-1.5 text-xs font-bold text-brand-600 shadow-sm sm:px-2.5 sm:text-sm">
                Tk {meal.price}
              </span>
            </div>

            <p className="mt-2 text-xs text-ink-400">
              Set by the Weekly Menu Planner and cannot be changed. Maximum 1
              meal per day.
            </p>

            {alreadyOrderedToday && (
              <p className="mt-2 text-xs font-semibold text-brand-600">
                You've already collected today's meal — come back tomorrow.
              </p>
            )}
          </section>

          {/* Collection type */}
          <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-bold text-ink-700">How will you collect it?</h2>

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["dine_in", "Dine In", Store],
                ["take_away", "Take Away", ShoppingBag],
              ].map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCollectionType(value)}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition ${
                    collectionType === value
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-ink-100 bg-white text-ink-700 hover:border-brand-300"
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="font-semibold">{label}</span>
                </button>
              ))}
            </div>

            {collectionType === "dine_in" && (
              <div className="mt-4">
                <label
                  htmlFor="tableNumber"
                  className="mb-1 block text-sm font-medium text-ink-700"
                >
                  Table Number <span className="text-brand-600">*</span>
                </label>
                <input
                  id="tableNumber"
                  type="number"
                  min="1"
                  max="500"
                  inputMode="numeric"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:max-w-xs"
                />
              </div>
            )}
          </section>
        </div>

        {/* Summary */}
        <aside className="h-fit w-full space-y-4 self-start rounded-xl border border-ink-100 bg-white p-4 sm:p-5 lg:sticky lg:top-20">
          <h2 className="text-sm font-bold text-ink-700">Order Summary</h2>

          <div className="flex w-full min-w-0 items-center justify-between gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-ink-700">{meal.name}</span>
            <span className="shrink-0 whitespace-nowrap font-semibold text-ink-900">
              Tk {meal.price}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-ink-100 pt-3 text-base font-bold text-ink-900">
            <span>Total</span>
            <span>Tk {alreadyOrderedToday ? 0 : meal.price}</span>
          </div>

          <p className="text-xs text-ink-400">
            {collectionType === "dine_in"
              ? tableNumber
                ? `Dine In · Table ${tableNumber}`
                : "Dine In · table number required"
              : "Take Away"}
          </p>

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5"
          >
            <Send size={16} />
            {submitting
              ? "Submitting..."
              : alreadyOrderedToday
                ? "Already ordered today"
                : "Submit Order"}
          </button>
        </aside>
      </form>
    </div>
  );
}