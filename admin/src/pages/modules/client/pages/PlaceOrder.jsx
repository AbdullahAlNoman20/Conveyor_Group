// admin/src/pages/modules/client/pages/PlaceOrder.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Lock, Wallet } from "lucide-react";
import { apiGet, apiPost } from "../../../../components/services/api";
import { useToast } from "../../../../components/hooks/useToast";
import Loader from "../../../../components/shared/Loader";
import DishImage from "../../../../components/shared/DishImage";

export default function PlaceOrder() {
  const { push } = useToast();
  const navigate = useNavigate();

  const [meal, setMeal] = useState(null);
  const [alreadyOrderedToday, setAlreadyOrderedToday] = useState(false);
  const [totalDue, setTotalDue] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [fixedMeal, dashboard] = await Promise.all([
          apiGet("/orders/meta/todays-fixed-meal"),
          apiGet("/reports/dashboard"),
        ]);
        if (!mounted) return;
        setMeal(fixedMeal);
        setAlreadyOrderedToday(dashboard.spend.todayOrders > 0);
        setTotalDue(dashboard.totalDue ?? 0);
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
    setSubmitting(true);
    try {
      // Nothing is sent: the dish, the price and the meal-slot reservation are
      // all decided server-side from the weekly planner and the session.
      const order = await apiPost("/orders", {});
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

  return (
    <div className="mx-auto max-w-2xl space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Place Order</h1>
        <p className="text-sm text-ink-400">
          One tap confirms today's meal — your name goes straight to the
          collection board.
        </p>
      </div>

      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
          <Lock size={14} /> Today's Fixed Meal ({meal.day})
        </h2>

        <div className="flex min-w-0 items-center gap-3 overflow-hidden rounded-xl bg-ink-50 p-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm sm:h-20 sm:w-20">
            <DishImage
              name={meal.name}
              className="h-full w-full object-cover"
              rounded="rounded-xl"
              height={80}
            />
          </div>

          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-sm font-semibold text-ink-800 sm:text-base">
              {meal.name}
            </p>
            <p className="mt-1 text-xs text-ink-400">
              Set by the Weekly Menu Planner — can't be changed.
            </p>
          </div>

          <span className="shrink-0 whitespace-nowrap rounded-lg bg-white px-2.5 py-1.5 text-sm font-bold text-brand-600 shadow-sm">
            Tk {meal.price}
          </span>
        </div>

        {alreadyOrderedToday && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            You've already collected today's meal — maximum 1 meal per day.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
          <Wallet size={14} /> Billing
        </h2>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-ink-500">
            <span>Current outstanding</span>
            <span className="font-semibold text-ink-800">Tk {totalDue}</span>
          </div>

          <div className="flex items-center justify-between text-ink-500">
            <span>This order</span>
            <span className="font-semibold text-brand-600">
              + Tk {alreadyOrderedToday ? 0 : meal.price}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-ink-100 pt-2 text-base font-bold text-ink-900">
            <span>New total</span>
            <span>Tk {totalDue + (alreadyOrderedToday ? 0 : meal.price)}</span>
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-ink-400">
          This amount is deducted from your salary. Every order appears on your
          Monthly Statement.
        </p>
      </section>

      <form onSubmit={submit}>
        <button
          type="submit"
          disabled={alreadyOrderedToday || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} />
          {submitting
            ? "Confirming..."
            : alreadyOrderedToday
              ? "Already ordered today"
              : `Confirm Order — Tk ${meal.price}`}
        </button>
      </form>
    </div>
  );
}