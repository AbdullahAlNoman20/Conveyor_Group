// FILE: src/pages/modules/guest/pages/GuestPlaceOrder.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, Send, ShoppingBag } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { genId } from "../../../../components/utils/idGenerator";
import { playAlertSound } from "../../../../components/services/notify";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Loader from "../../../../components/shared/Loader";
import DishImage from "../../../../components/shared/DishImage";

const VAT_RATE = 0.05;

export default function GuestPlaceOrder() {
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [menu, setMenu] = useState(null);
  const [collectionType, setCollectionType] = useState("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => setMenu(await dataStore.load("menu", "menu.json")))();
  }, []);

  if (!menu) return <Loader full label="Loading menu..." />;

  function addItem(m) {
    setItems((list) => {
      const existing = list.find((i) => i.menuId === m.id);

      if (existing) {
        return list.map((i) =>
          i.menuId === m.id
            ? { ...i, qty: i.qty + 1 }
            : i
        );
      }

      return [
        ...list,
        {
          menuId: m.id,
          name: m.name,
          qty: 1,
          unitPrice: m.price,
        },
      ];
    });
  }

  function updateQty(menuId, delta) {
    setItems((list) =>
      list
        .map((i) =>
          i.menuId === menuId
            ? {
                ...i,
                qty: Math.max(1, i.qty + delta),
              }
            : i
        )
        .filter((i) => i.qty > 0)
    );
  }

  const subtotal = items.reduce(
    (s, i) => s + i.qty * i.unitPrice,
    0
  );
  const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100;
  const total = subtotal + vatAmount;

  async function submit(e) {
    e.preventDefault();

    if (submitting) return;

    if (items.length === 0) {
      push("Add at least one item to your order.", "error");
      return;
    }

    if (collectionType === "dine_in" && !tableNumber) {
      push("Table number is required for Dine-In.", "error");
      return;
    }

    const parsedTable = Number(tableNumber);
    if (
      collectionType === "dine_in" &&
      (!Number.isInteger(parsedTable) || parsedTable <= 0)
    ) {
      push("Enter a valid table number.", "error");
      return;
    }

    setSubmitting(true);

    const order = {
      id: genId("ORD"),
      clientName: `Guest - ${user?.name || "Guest"}`,
      tableNumber: collectionType === "dine_in" ? parsedTable : null,
      orderType:
        collectionType === "dine_in"
          ? "guest_order"
          : "take_away",
      priority: "normal",
      items: items.map(({ name, qty, unitPrice }) => ({
        name,
        qty: Math.max(1, Number(qty) || 1),
        unitPrice: Math.max(0, Number(unitPrice) || 0),
      })),
      subtotal,
      discount: 0,
      tax: vatAmount,
      vatRate: VAT_RATE,
      amount: total,
      paymentMethod: "cash",
      status: "awaiting_manager",
      selfPlaced: true,
      createdAt: new Date().toISOString(),
    };

    try {
      await dataStore.insert("orders", order);

      playAlertSound();

      socket.emit(SOCKET_EVENTS.ORDER_SUBMITTED, {
        message: `Order ${order.id} submitted for approval.`,
        recipientRoles: ["manager"],
      });

      push("Order submitted — waiting for Manager approval.", "success");

      navigate(`/app/guest/orders/${order.id}`);
    } catch {
      push("Could not submit your order. Please try again.", "error");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <ShoppingBag size={21} />
          </div>

          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
              Place Order
            </h1>

            <p className="mt-1 text-xs leading-5 text-ink-400 sm:text-sm">
              Order directly from the menu — a Manager will confirm it
              shortly.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="grid min-w-0 gap-5 lg:grid-cols-3 lg:gap-6"
      >
        {/* LEFT CONTENT */}
        <div className="min-w-0 space-y-5 sm:space-y-6 lg:col-span-2">
          {/* MENU */}
          <section className="min-w-0 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
            <div className="border-b border-ink-100 bg-ink-50/60 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-ink-700 sm:text-base">
                    Menu
                  </h2>

                  <p className="mt-0.5 text-xs text-ink-400">
                    Select an item to add it to your order.
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600">
                  {menu.length} items
                </span>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                {menu.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => addItem(m)}
                    className="group flex min-w-0 w-full items-center gap-3 overflow-hidden rounded-xl border border-ink-100 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/50"
                  >
                    {/* FOOD IMAGE */}
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50 sm:h-[72px] sm:w-[72px]">
                      <DishImage
                        name={m.name}
                        className="block h-full w-full object-cover"
                        rounded="rounded-xl"
                        height={72}
                      />
                    </div>

                    {/* FOOD INFORMATION */}
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="truncate text-sm font-semibold text-ink-800">
                        {m.name}
                      </p>

                      <p className="mt-1 truncate text-xs text-ink-400">
                        {m.category}
                      </p>

                      <p className="mt-2 text-sm font-bold text-brand-600">
                        Tk {m.price}
                      </p>
                    </div>

                    {/* ADD BUTTON */}
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                      <Plus size={17} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* COLLECTION */}
          <section className="min-w-0 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
            <div className="border-b border-ink-100 bg-ink-50/60 px-4 py-4 sm:px-5">
              <h2 className="text-sm font-bold text-ink-700 sm:text-base">
                Collection
              </h2>
            </div>

            <div className="grid min-w-0 gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <FormField label="Collection Type" required>
                <select
                  value={collectionType}
                  onChange={(e) =>
                    setCollectionType(e.target.value)
                  }
                  className="w-full min-w-0 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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
                  onChange={(e) =>
                    setTableNumber(e.target.value)
                  }
                  className="w-full min-w-0 rounded-xl border border-ink-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50"
                />
              </FormField>
            </div>
          </section>
        </div>

        {/* ORDER SUMMARY */}
        <aside className="h-fit min-w-0 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm lg:sticky lg:top-20">
          <div className="border-b border-ink-100 bg-ink-50/60 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-ink-700 sm:text-base">
                Order Summary
              </h2>

              <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600">
                {items.length} item
                {items.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="min-w-0 p-4 sm:p-5">
            <div className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
              {items.map((i) => (
                <div
                  key={i.menuId}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-ink-100 bg-ink-50/50 p-2.5"
                >
                  {/* ITEM NAME */}
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-ink-700">
                      {i.name}
                    </p>

                    <p className="mt-0.5 text-xs text-ink-400">
                      Tk {i.unitPrice} each
                    </p>
                  </div>

                  {/* QUANTITY */}
                  <div className="flex shrink-0 items-center gap-1 rounded-lg bg-white p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() =>
                        updateQty(i.menuId, -1)
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-100 text-ink-600 transition hover:bg-ink-200"
                    >
                      <Minus size={12} />
                    </button>

                    <span className="w-6 text-center text-xs font-semibold text-ink-800">
                      {i.qty}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        updateQty(i.menuId, 1)
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-100 text-ink-600 transition hover:bg-ink-200"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* ITEM TOTAL */}
                  <span className="w-[58px] shrink-0 text-right text-xs font-bold text-ink-900 sm:w-16 sm:text-sm">
                    Tk {i.qty * i.unitPrice}
                  </span>
                </div>
              ))}

              {items.length === 0 && (
                <div className="rounded-xl border border-dashed border-ink-200 px-4 py-10 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ink-50 text-ink-300">
                    <ShoppingBag size={19} />
                  </div>

                  <p className="mt-3 text-sm font-medium text-ink-500">
                    No items yet.
                  </p>

                  <p className="mt-1 text-xs text-ink-400">
                    Select something from the menu.
                  </p>
                </div>
              )}
            </div>

            {/* SUBTOTAL / VAT / TOTAL */}
            <div className="mt-4 space-y-1.5 border-t border-ink-100 pt-4">
              <div className="flex items-center justify-between text-xs text-ink-500">
                <span>Subtotal</span>
                <span>Tk {subtotal}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-ink-500">
                <span>VAT (5%)</span>
                <span>Tk {vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-2">
                <span className="text-sm font-semibold text-ink-600">
                  Total
                </span>

                <span className="shrink-0 text-lg font-bold text-ink-900">
                  Tk {total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} />
              {submitting ? "Submitting..." : "Submit Order"}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}