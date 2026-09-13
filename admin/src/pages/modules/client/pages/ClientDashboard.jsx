// admin/src/pages/modules/client/pages/ClientDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Utensils,
  Receipt,
  QrCode,
  TrendingUp,
  ScanLine,
  X,
  Keyboard,
  CheckCircle2,
  ShoppingCart,
  ArrowRight,
  Wallet,
} from "lucide-react";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import Modal from "../../../../components/shared/Modal";
import QRScannerCamera from "../../../../components/shared/QRScannerCamera";
import MealAttendanceCard from "../../../../components/shared/MealAttendanceCard";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import {
  isMobileDevice,
  hasCameraSupport,
} from "../../../../components/utils/device";
import { createInstantFixedMealOrder } from "../../../../components/services/selfOrder";
import { dataStore } from "../../../../components/services/dataStore";
import { apiGet } from "../../../../components/services/api";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function ClientDashboard() {
  const { user } = useAuth();
  const { push } = useToast();

  // SECURITY: the old `clients.find(byName) || clients[0]` fallback showed this
  // client someone ELSE's data when no name matched. /reports/dashboard is
  // resolved from the session user id on the server instead.
  const [dash, setDash] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [placing, setPlacing] = useState(false);
  const [scanFailed, setScanFailed] = useState(false);

  const canUseCamera = isMobileDevice() && hasCameraSupport();

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      try {
        const data = await apiGet("/reports/dashboard");
        if (mounted) setDash(data);
      } catch {
        // keep the last good render rather than blanking the page
      }
    }

    refresh();
    const unsubOrders = dataStore.subscribe("orders", refresh);
    const unsubAttendance = dataStore.subscribe("attendance", refresh);

    return () => {
      mounted = false;
      unsubOrders();
      unsubAttendance();
    };
  }, []);

  async function attemptInstantOrder(scannedCode) {
    // The station code, the plan check, the cancellation check, the
    // one-per-day rule and the meal-slot reservation are all verified
    // server-side in a single transaction.
    setPlacing(true);
    try {
      const order = await createInstantFixedMealOrder({
        source: "self_scan",
        stationCode: (scannedCode || "").trim(),
      });
      push(
        `Order ${order.id} confirmed — sent straight to the kitchen board!`,
        "success",
      );
      setScannerOpen(false);
      setManualCode("");
    } catch (err) {
      push(err?.message || "Couldn't place your order. Please try again.", "error");
    } finally {
      setPlacing(false);
    }
  }

  function openScanner() {
    setScanFailed(false);
    setScannerOpen(true);
  }

  function closeScanner() {
    setScannerOpen(false);
    setManualCode("");
  }

  if (!dash) return <Loader full label="Loading your dashboard..." />;

  const isFixedMealClient = dash.mealPlan === "Fixed Company Meal";

  // A cancelled meal was never cooked and a collected one is already gone, so
  // both close ordering for the rest of the day — on every path.
  // Two independent gates: what already happened today, and the clock. The
  // status reason wins, because "you cancelled" is more useful than "closed".
  const att = dash.attendance ?? {};
  const attendanceStatus = att.status ?? "pending";
  const windowOpen = att.orderWindowOpen !== false;
  const windowLabel = att.orderWindowLabel || "11:00 AM – 6:00 PM";
  const canOrderToday = attendanceStatus === "pending" && windowOpen;

  const orderBlockedReason =
    attendanceStatus === "cancelled"
      ? "You cancelled today's meal — it wasn't prepared."
      : attendanceStatus === "collected"
        ? "Today's meal has already been collected."
        : attendanceStatus === "no_show"
          ? `Missed — ordering closed at ${windowLabel.split("–").pop().trim()}.`
          : !windowOpen
            ? `Ordering opens ${windowLabel}.`
            : "";

  // Aggregates come from one indexed SQL query instead of pulling every order
  // into the browser and summing it there.
  const { todaySpend, weekSpend, monthSpend, todayOrders, monthOrders } = dash.spend;
  const maxSpend = Math.max(todaySpend, weekSpend, monthSpend, 1);
  const recentOrders = dash.recentOrders || [];
  const todayName = WEEKDAYS[new Date().getDay()];
  const todaysFixedMealName = dash.todaysFixedMeal?.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
          Welcome, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-ink-400">
          Here's your meal summary for today.
        </p>
      </div>

      <MealAttendanceCard
        attendance={dash.attendance}
        onChange={(next) => setDash((d) => ({ ...d, attendance: next }))}
      />

      {/* Both actions stay VISIBLE when ordering is closed and turn disabled
          instead, so the reason is obvious rather than the buttons silently
          vanishing. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {isFixedMealClient && (
          <button
            type="button"
            onClick={openScanner}
            disabled={!canOrderToday}
            title={orderBlockedReason}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-4 text-left transition sm:px-5 ${
              canOrderToday
                ? "border-brand-200 bg-brand-50 hover:bg-brand-100"
                : "cursor-not-allowed border-ink-100 bg-ink-50 opacity-60"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${
                  canOrderToday ? "bg-brand-600" : "bg-ink-300"
                }`}
              >
                <ScanLine size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink-900">
                  Scan to Order
                </span>
                <span className="block text-xs text-ink-500">
                  {canOrderToday
                    ? "Instant, no approval needed."
                    : orderBlockedReason}
                </span>
              </span>
            </span>
            <QrCode
              size={20}
              className={`shrink-0 ${canOrderToday ? "text-brand-600" : "text-ink-300"}`}
            />
          </button>
        )}

        {canOrderToday ? (
          <Link
            to="/app/client/place-order"
            className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white px-4 py-4 text-left transition hover:border-brand-300 hover:bg-brand-50 sm:px-5"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-white">
                <ShoppingCart size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink-900">
                  Place Order
                </span>
                <span className="block text-xs text-ink-500">
                  Order manually, no QR scan required.
                </span>
              </span>
            </span>
            <ArrowRight size={18} className="shrink-0 text-ink-400" />
          </Link>
        ) : (
          <div
            title={orderBlockedReason}
            className="flex cursor-not-allowed items-center justify-between gap-3 rounded-xl border border-ink-100 bg-ink-50 px-4 py-4 text-left opacity-60 sm:px-5"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-300 text-white">
                <ShoppingCart size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink-900">
                  Place Order
                </span>
                <span className="block text-xs text-ink-500">
                  {orderBlockedReason}
                </span>
              </span>
            </span>
            <ArrowRight size={18} className="shrink-0 text-ink-300" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <Link to="/app/client/statement">
          <StatCard
            label="Today's Orders"
            value={todayOrders}
            Icon={Utensils}
            accent="amber"
          />
        </Link>
        <Link to="/app/client/statement">
          <StatCard
            label="This Month's Orders"
            value={monthOrders}
            Icon={Receipt}
            accent="brand"
          />
        </Link>
        <Link to="/app/client/statement">
          <StatCard
            label="Total Due"
            value={`Tk ${dash.totalDue ?? 0}`}
            Icon={Wallet}
            accent="emerald"
          />
        </Link>
        <Link to="/app/client/qr-card">
          <StatCard
            label="QR Status"
            value={dash.qrStatus ?? "active"}
            Icon={QrCode}
            accent="ink"
          />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-2 text-sm font-bold text-ink-700">Today's Meal</h2>
          {isFixedMealClient ? (
            <p className="text-sm text-ink-600">
              Your fixed meal today (
              <span className="font-semibold text-ink-900">{todayName}</span>) is{" "}
              <span className="font-semibold text-brand-600">
                {todaysFixedMealName || "not set yet"}
              </span>
              . This is set by the Weekly Meal Planner and can't be changed.
            </p>
          ) : (
            <p className="text-sm text-ink-500">
              Your meal plan doesn't include the daily fixed meal.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink-700">
              <TrendingUp size={15} /> Spend Summary
            </h2>
            <Link
              to="/app/client/statement"
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              View Details
            </Link>
          </div>
          <div className="space-y-3">
            {[
              ["Today", todaySpend],
              ["This Week", weekSpend],
              ["This Month", monthSpend],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-500">{label}</span>
                  <span className="font-semibold text-ink-900">Tk {value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.max(4, (value / maxSpend) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink-700">Recent Orders</h2>
          <Link
            to="/app/client/statement"
            className="text-xs font-semibold text-brand-600 hover:underline"
          >
            View All
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-ink-500">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((o) => (
              <Link
                key={o.id}
                to={`/app/client/orders/${o.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 px-3 py-2.5 hover:border-brand-300 hover:bg-brand-50"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-800">
                      {o.id}
                    </p>
                    <p className="truncate text-xs text-ink-400">
                      {o.items?.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-bold text-ink-900">
                  Tk {o.amount}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={scannerOpen}
        onClose={closeScanner}
        title="Scan Self-Order Station"
        size="sm"
      >
        <div className="space-y-4">
          {canUseCamera && !scanFailed ? (
            <QRScannerCamera
              onScan={attemptInstantOrder}
              onError={() => setScanFailed(true)}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                <Keyboard size={14} className="mt-0.5 shrink-0" />
                Camera isn't available right now — type the station code shown on
                the counter's Self-Order screen instead.
              </div>
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter station code..."
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="button"
                disabled={placing || !manualCode.trim()}
                onClick={() => attemptInstantOrder(manualCode)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {placing ? "Placing order..." : "Confirm Order"}
              </button>
            </div>
          )}
          <p className="text-center text-xs text-ink-400">
            Today's meal:{" "}
            <span className="font-semibold text-ink-700">
              {todaysFixedMealName || "—"}
            </span>
          </p>
          <button
            type="button"
            onClick={closeScanner}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-ink-200 py-2 text-xs font-semibold text-ink-500 hover:bg-ink-50"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}