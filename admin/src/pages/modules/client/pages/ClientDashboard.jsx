// FILE: src/pages/modules/client/pages/ClientDashboard.jsx (MODIFIED — removed "Current Month Bill" wallet-era stat card)
import { useState } from "react";
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
} from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "../../../../components/shared/StatCard";
import Loader from "../../../../components/shared/Loader";
import Modal from "../../../../components/shared/Modal";
import QRScannerCamera from "../../../../components/shared/QRScannerCamera";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import {
  isMobileDevice,
  hasCameraSupport,
} from "../../../../components/utils/device";
import {
  createInstantFixedMealOrder,
  todaysFixedMeal as getTodaysFixedMeal,
} from "../../../../components/services/selfOrder";
import { dataStore } from "../../../../components/services/dataStore";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function startOfWeek(d) {
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const { push } = useToast();
  const clients = useLiveCollection("clients", "clients.json");
  const orders = useLiveCollection("orders", "orders.json");
  const weeklyMenu = useLiveCollection("weeklyMenu", "weekly-menu.json");
  const menu = useLiveCollection("menu", "menu.json");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [placing, setPlacing] = useState(false);
  const [scanFailed, setScanFailed] = useState(false);
  const canUseCamera = isMobileDevice() && hasCameraSupport();

  if (!clients || !orders || !weeklyMenu || !menu)
    return <Loader full label="Loading your dashboard..." />;

  const me = clients.find((c) => c.name === user?.name) || clients[0];
  const isFixedMealClient = me?.mealPlan === "Fixed Company Meal";

  async function attemptInstantOrder(scannedCode) {
    try {
      const settings = await dataStore.load("settings", "settings.json");
      if (
        !scannedCode ||
        scannedCode.trim() !== settings?.selfOrderStationCode
      ) {
        push("That doesn't match the Self-Order Station code.", "error");
        return;
      }
      if (!isFixedMealClient) {
        push(
          "Self-Order Station is only available for Fixed Company Meal plans.",
          "error",
        );
        return;
      }
      setPlacing(true);
      const order = await createInstantFixedMealOrder({
        client: me,
        clients,
        orders,
        weeklyMenu,
        menu,
        source: "self_scan",
      });
      push(
        `Order ${order.id} confirmed — sent straight to the kitchen board!`,
        "success",
      );
      setScannerOpen(false);
      setManualCode("");
    } catch (err) {
      push(
        err?.message || "Couldn't place your order. Please try again.",
        "error",
      );
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

  const myOrders = orders.filter(
    (o) => o.clientId === user?.id || o.clientName === user?.name,
  );
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const billable = myOrders.filter(
    (o) => !["cancelled", "rejected"].includes(o.status),
  );
  const todaysOrders = billable.filter(
    (o) => (o.createdAt || "").slice(0, 10) === todayISO,
  );
  const weeksOrders = billable.filter(
    (o) => new Date(o.createdAt) >= weekStart,
  );
  const monthsOrders = billable.filter(
    (o) => new Date(o.createdAt) >= monthStart,
  );

  const todaySpend = todaysOrders.reduce((s, o) => s + o.amount, 0);
  const weekSpend = weeksOrders.reduce((s, o) => s + o.amount, 0);
  const monthSpend = monthsOrders.reduce((s, o) => s + o.amount, 0);
  const maxSpend = Math.max(todaySpend, weekSpend, monthSpend, 1);

  const recentOrders = [...billable]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

  const todayName = WEEKDAYS[new Date().getDay()];
  const todaysFixedMealName = weeklyMenu.find((d) => d.day === todayName)?.meal;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
          Welcome, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-ink-400">
          Here's your meal & billing summary for today.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {isFixedMealClient && (
          <button
            type="button"
            onClick={openScanner}
            className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-4 text-left hover:bg-brand-100 sm:px-5"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
                <ScanLine size={20} />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink-900">
                  Scan to Order
                </span>
                <span className="block text-xs text-ink-500">
                  Instant, no approval needed.
                </span>
              </span>
            </span>
            <QrCode size={20} className="shrink-0 text-brand-600" />
          </button>
        )}

        <Link
          to="/app/client/place-order"
          className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white px-4 py-4 text-left hover:border-brand-300 hover:bg-brand-50 sm:px-5"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-white">
              <ShoppingCart size={20} />
            </span>
            <span>
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
      </div>

      {/* Stat cards — "Current Month Bill" (tied to the removed wallet/salary
          billing system) has been dropped. Replaced with a plain order-count
          stat that doesn't depend on any wallet/salary concept. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Link to="/app/client/statement">
          <StatCard
            label="Today's Orders"
            value={todaysOrders.length}
            Icon={Utensils}
            accent="amber"
          />
        </Link>
        <Link to="/app/client/statement">
          <StatCard
            label="This Month's Orders"
            value={monthsOrders.length}
            Icon={Receipt}
            accent="brand"
          />
        </Link>
        <Link to="/app/client/qr-card">
          <StatCard
            label="QR Status"
            value={me?.qrStatus ?? "active"}
            Icon={QrCode}
            accent="ink"
          />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-2 text-sm font-bold text-ink-700">Today's Meal</h2>
          {me?.mealPlan === "Fixed Company Meal" ? (
            <p className="text-sm text-ink-600">
              Your fixed meal today (
              <span className="font-semibold text-ink-900">{todayName}</span>)
              is{" "}
              <span className="font-semibold text-brand-600">
                {todaysFixedMealName}
              </span>
              . This is set by the Weekly Meal Planner and can't be changed.
            </p>
          ) : (
            <p className="text-sm text-ink-500">
              You're on a Custom Menu — choose from the full menu when you place
              an order.
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
                    style={{
                      width: `${Math.max(4, (value / maxSpend) * 100)}%`,
                    }}
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
                  <CheckCircle2
                    size={16}
                    className="shrink-0 text-emerald-600"
                  />
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
                Camera isn't available right now — type the station code shown
                on the counter's Self-Order screen instead.
              </div>
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter station code..."
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none   focus:ring-brand-100"
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
              {getTodaysFixedMeal(weeklyMenu, menu).name}
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
