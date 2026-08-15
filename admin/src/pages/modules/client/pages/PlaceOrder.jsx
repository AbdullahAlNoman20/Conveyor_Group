// FILE: src/pages/modules/client/pages/PlaceOrder.jsx (FULL REWRITE — snacks exempt from once-daily limit + token modal)
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, Send, Lock, Cookie } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { genId } from "../../../../components/utils/idGenerator";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Loader from "../../../../components/shared/Loader";
import DishImage from "../../../../components/shared/DishImage";
import OrderTokenModal from "../../../../components/shared/OrderTokenModal";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const SNACK_CATEGORY = "Evening Snack";

export default function PlaceOrder() {
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [clients, setClients] = useState(null);
  const [menu, setMenu] = useState(null);
  const [weeklyMenu, setWeeklyMenu] = useState(null);
  const [orders, setOrders] = useState(null);

  const [collectionType, setCollectionType] = useState("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [items, setItems] = useState([]);
  const [snackItems, setSnackItems] = useState([]);
  const [payFrom, setPayFrom] = useState("wallet");
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  useEffect(() => {
    (async () => {
      setClients(await dataStore.load("clients", "clients.json"));
      setMenu(await dataStore.load("menu", "menu.json"));
      setWeeklyMenu(await dataStore.load("weeklyMenu", "weekly-menu.json"));
      setOrders(await dataStore.load("orders", "orders.json"));
    })();
  }, []);

  if (!clients || !menu || !weeklyMenu || !orders)
    return <Loader full label="Loading menu..." />;

  const me = clients.find((c) => c.name === user?.name) || clients[0];
  const isFixed = me?.mealPlan === "Fixed Company Meal";
  const todayName = DAY_NAMES[new Date().getDay()];
  const fixedMealName =
    weeklyMenu.find((d) => d.day === todayName)?.meal || "Today's Set Meal";
  const fixedMealPrice =
    menu.find((m) => m.name === fixedMealName)?.price ?? 100;
  const snackMenu = menu.filter(
    (m) => m.category === SNACK_CATEGORY && m.available !== false,
  );

  // Only the MAIN meal is limited to once a day — snacks are exempt (SRS §14).
  const alreadyOrderedToday = orders.some((o) => {
    const sameDay =
      new Date(o.createdAt).toDateString() === new Date().toDateString();
    const isMainMeal = !o.snackOnly;
    return (
      sameDay &&
      isMainMeal &&
      o.clientName === user?.name &&
      o.status !== "cancelled" &&
      o.status !== "rejected"
    );
  });

  function addItem(m) {
    setItems((list) => {
      const existing = list.find((i) => i.menuId === m.id);
      if (existing)
        return list.map((i) =>
          i.menuId === m.id ? { ...i, qty: i.qty + 1 } : i,
        );
      return [
        ...list,
        { menuId: m.id, name: m.name, qty: 1, unitPrice: m.price },
      ];
    });
  }
  function updateQty(menuId, delta) {
    setItems((list) =>
      list
        .map((i) =>
          i.menuId === menuId ? { ...i, qty: Math.max(1, i.qty + delta) } : i,
        )
        .filter((i) => i.qty > 0),
    );
  }
  function addSnack(m) {
    setSnackItems((list) => {
      const existing = list.find((i) => i.menuId === m.id);
      if (existing)
        return list.map((i) =>
          i.menuId === m.id ? { ...i, qty: i.qty + 1 } : i,
        );
      return [
        ...list,
        { menuId: m.id, name: m.name, qty: 1, unitPrice: m.price },
      ];
    });
  }
  function updateSnackQty(menuId, delta) {
    setSnackItems((list) =>
      list
        .map((i) =>
          i.menuId === menuId ? { ...i, qty: Math.max(1, i.qty + delta) } : i,
        )
        .filter((i) => i.qty > 0),
    );
  }

  const mainItems = isFixed
    ? alreadyOrderedToday
      ? []
      : [
          {
            menuId: "fixed",
            name: fixedMealName,
            qty: 1,
            unitPrice: fixedMealPrice,
          },
        ]
    : items;
  const orderItems = [...mainItems, ...snackItems];
  const total = orderItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const isSnackOnlySubmission = mainItems.length === 0 && snackItems.length > 0;

  async function submit(e) {
    e.preventDefault();
    if (orderItems.length === 0) {
      push(
        alreadyOrderedToday
          ? "You've already had today's meal — add an Evening Snack to order again."
          : "Add at least one item to your order.",
        "error",
      );
      return;
    }
    if (collectionType === "dine_in" && !tableNumber) {
      push("Table number is required for Dine-In.", "error");
      return;
    }

    const order = {
      id: genId("ORD"),
      clientName: user.name,
      employeeId: me?.employeeId,
      department: me?.department,
      tableNumber: collectionType === "dine_in" ? Number(tableNumber) : null,
      orderType: collectionType === "dine_in" ? "dine_in" : "take_away",
      priority: "normal",
      specialInstructions: "",
      items: orderItems.map(({ name, qty, unitPrice }) => ({
        name,
        qty,
        unitPrice,
      })),
      subtotal: total,
      discount: 0,
      tax: 0,
      amount: total,
      paymentMethod: payFrom,
      status: "awaiting_manager",
      selfPlaced: true,
      snackOnly: isSnackOnlySubmission,
      createdAt: new Date().toISOString(),
    };

    await dataStore.insert("orders", order);
    socket.emit(SOCKET_EVENTS.ORDER_SUBMITTED, {
      message: `Your order ${order.id} was submitted for approval.`,
      recipientRoles: ["manager"],
    });
    push("Order submitted — waiting for Manager approval.", "success");
    setConfirmedOrder(order);
  }

  function closeTokenModal() {
    setConfirmedOrder(null);
    navigate("/app/client");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Place Order</h1>
        <p className="text-sm text-ink-400">
          Order instantly — no need to wait for a Manager to scan you in. It
          still goes through Manager approval before reaching the kitchen.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {isFixed ? (
            <section className="rounded-xl border border-ink-100 bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
                <Lock size={14} /> Today's Fixed Meal ({todayName})
              </h2>
              <div className="flex min-w-0 items-center gap-3 overflow-hidden rounded-xl bg-ink-50 p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm">
                  <DishImage
                    name={fixedMealName}
                    className="h-full w-full object-cover"
                    rounded="rounded-xl"
                    height={64}
                  />
                </div>

                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-sm font-semibold text-ink-800">
                    {fixedMealName}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    Today's Fixed Meal
                  </p>
                </div>

                <span className="shrink-0 whitespace-nowrap rounded-lg bg-white px-2.5 py-1.5 text-sm font-bold text-brand-600 shadow-sm">
                  Tk {fixedMealPrice}
                </span>
              </div>
              <p className="mt-2 text-xs text-ink-400">
                Your Meal Plan is Fixed Company Meal — this is set by the Weekly
                Menu Planner and cannot be changed. Maximum 1 meal per day.
              </p>
              {alreadyOrderedToday && (
                <p className="mt-2 text-xs font-semibold text-brand-600">
                  Already collected today — you can still order an Evening Snack
                  below.
                </p>
              )}
            </section>
          ) : (
            <section className="rounded-xl border border-ink-100 bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-ink-700">
                Choose from the Menu
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {menu
                  .filter((m) => m.category !== SNACK_CATEGORY)
                  .map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => addItem(m)}
                      className="flex min-w-0 w-full items-center gap-3 overflow-hidden rounded-xl border border-ink-100 bg-white p-3 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-50">
                        <DishImage
                          name={m.name}
                          className="h-full w-full object-cover"
                          rounded="rounded-xl"
                          height={56}
                        />
                      </div>

                      <span className="min-w-0 flex-1 overflow-hidden">
                        <span className="block truncate font-semibold text-ink-800">
                          {m.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-400">
                          {m.category}
                        </span>
                      </span>

                      <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-brand-50 px-2 py-1.5 text-xs font-semibold text-brand-600">
                        <Plus size={14} />
                        Tk {m.price}
                      </span>
                    </button>
                  ))}
              </div>
            </section>
          )}

          {snackMenu.length > 0 && (
            <section className="rounded-xl border border-ink-100 bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700">
                <Cookie size={14} /> Evening Snacks{" "}
                <span className="font-normal text-ink-400">
                  (order as many times as you like)
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {snackMenu.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => addSnack(m)}
                    className="flex min-w-0 w-full items-center gap-3 overflow-hidden rounded-xl border border-ink-100 bg-white p-3 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-50">
                      <DishImage
                        name={m.name}
                        className="h-full w-full object-cover"
                        rounded="rounded-xl"
                        height={56}
                      />
                    </div>

                    <span className="min-w-0 flex-1 overflow-hidden">
                      <span className="block truncate font-semibold text-ink-800">
                        {m.name}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-brand-50 px-2 py-1.5 text-xs font-semibold text-brand-600">
                      <Plus size={14} />
                      Tk {m.price}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-ink-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold text-ink-700">Collection</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Collection Type" required>
                <select
                  value={collectionType}
                  onChange={(e) => setCollectionType(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="dine_in">Dine In</option>
                  <option value="take_away">Take Away</option>
                </select>
              </FormField>
              <FormField
                label="Table Number"
                required={collectionType === "dine_in"}
              >
                <input
                  type="number"
                  disabled={collectionType !== "dine_in"}
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50"
                />
              </FormField>
            </div>
            <FormField label="Pay From" required className="mt-4">
              <select
                value={payFrom}
                onChange={(e) => setPayFrom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="wallet">Wallet</option>
                <option value="salary">Salary</option>
              </select>
            </FormField>
          </section>
        </div>

        <aside className="h-fit space-y-4 self-start rounded-xl border border-ink-100 bg-white p-5 lg:sticky lg:top-20">
          <h2 className="text-sm font-bold text-ink-700">Order Summary</h2>
          <div className="space-y-2">
            {orderItems.map((i) => {
              const isSnack = snackItems.some((s) => s.menuId === i.menuId);
              const locked = isFixed && i.menuId === "fixed";
              return (
                <div
                  key={i.menuId}
                  className="flex min-w-0 items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-ink-700">
                    {i.name}
                  </span>
                  {!locked && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          isSnack
                            ? updateSnackQty(i.menuId, -1)
                            : updateQty(i.menuId, -1)
                        }
                        className="rounded bg-ink-100 p-1 hover:bg-ink-200"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center">{i.qty}</span>
                      <button
                        type="button"
                        onClick={() =>
                          isSnack
                            ? updateSnackQty(i.menuId, 1)
                            : updateQty(i.menuId, 1)
                        }
                        className="rounded bg-ink-100 p-1 hover:bg-ink-200"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  )}
                  <span className="w-14 text-right font-semibold text-ink-900">
                    Tk {i.qty * i.unitPrice}
                  </span>
                </div>
              );
            })}
            {orderItems.length === 0 && (
              <p className="text-sm text-ink-400">No items yet.</p>
            )}
          </div>
          <div className="flex justify-between border-t border-ink-100 pt-3 text-base font-bold text-ink-900">
            <span>Total</span>
            <span>Tk {total}</span>
          </div>
          <button
            type="submit"
            disabled={orderItems.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} /> Submit Order
          </button>
        </aside>
      </form>

      <OrderTokenModal
        open={!!confirmedOrder}
        order={confirmedOrder}
        onClose={closeTokenModal}
      />
    </div>
  );
}
