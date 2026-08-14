// FILE: src/pages/modules/guest/pages/GuestPlaceOrder.jsx (FULL REWRITE — dish images + token modal, fixes prior ReferenceError)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, Send } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { genId } from "../../../../components/utils/idGenerator";
import { useAuth } from "../../../../components/hooks/useAuth";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Loader from "../../../../components/shared/Loader";
import DishImage from "../../../../components/shared/DishImage";
import OrderTokenModal from "../../../../components/shared/OrderTokenModal";

export default function GuestPlaceOrder() {
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [menu, setMenu] = useState(null);
  const [collectionType, setCollectionType] = useState("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [items, setItems] = useState([]);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  useEffect(() => {
    (async () => setMenu(await dataStore.load("menu", "menu.json")))();
  }, []);

  if (!menu) return <Loader full label="Loading menu..." />;

  function addItem(m) {
    setItems((list) => {
      const existing = list.find((i) => i.menuId === m.id);
      if (existing) return list.map((i) => (i.menuId === m.id ? { ...i, qty: i.qty + 1 } : i));
      return [...list, { menuId: m.id, name: m.name, qty: 1, unitPrice: m.price }];
    });
  }
  function updateQty(menuId, delta) {
    setItems((list) =>
      list.map((i) => (i.menuId === menuId ? { ...i, qty: Math.max(1, i.qty + delta) } : i)).filter((i) => i.qty > 0)
    );
  }

  const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  async function submit(e) {
    e.preventDefault();
    if (items.length === 0) {
      push("Add at least one item to your order.", "error");
      return;
    }
    if (collectionType === "dine_in" && !tableNumber) {
      push("Table number is required for Dine-In.", "error");
      return;
    }
    const order = {
      id: genId("ORD"),
      clientName: `Guest - ${user?.name || "Guest"}`,
      tableNumber: collectionType === "dine_in" ? Number(tableNumber) : null,
      orderType: collectionType === "dine_in" ? "guest_order" : "take_away",
      priority: "normal",
      items: items.map(({ name, qty, unitPrice }) => ({ name, qty, unitPrice })),
      subtotal: total,
      discount: 0,
      tax: 0,
      amount: total,
      paymentMethod: "cash",
      status: "awaiting_manager",
      selfPlaced: true,
      createdAt: new Date().toISOString(),
    };
    await dataStore.insert("orders", order);
    socket.emit(SOCKET_EVENTS.ORDER_SUBMITTED, {
      message: `Order ${order.id} submitted for approval.`,
      recipientRoles: ["manager"],
    });
    push("Order submitted — waiting for Manager approval.", "success");
    setConfirmedOrder(order);
  }

  function closeTokenModal() {
    setConfirmedOrder(null);
    navigate("/app/guest");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Place Order</h1>
        <p className="text-sm text-ink-400">Order directly from the menu — a Manager will confirm it shortly.</p>
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-ink-100 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-ink-700">Menu</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {menu.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => addItem(m)}
                  className="flex items-center gap-3 rounded-lg border border-ink-100 p-2 text-left text-sm hover:border-brand-300 hover:bg-brand-50"
                >
                  <DishImage name={m.name} className="h-12 w-12 shrink-0 rounded-lg" rounded="rounded-lg" height={48} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink-800">{m.name}</span>
                    <span className="block text-xs text-ink-400">{m.category}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 font-semibold text-brand-600">
                    <Plus size={14} /> Tk {m.price}
                  </span>
                </button>
              ))}
            </div>
          </section>

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
              <FormField label="Table Number" required={collectionType === "dine_in"}>
                <input
                  type="number"
                  disabled={collectionType !== "dine_in"}
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50"
                />
              </FormField>
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-4 self-start rounded-xl border border-ink-100 bg-white p-5 lg:sticky lg:top-20">
          <h2 className="text-sm font-bold text-ink-700">Order Summary</h2>
          <div className="space-y-2">
            {items.map((i) => (
              <div key={i.menuId} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex-1 truncate text-ink-700">{i.name}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => updateQty(i.menuId, -1)} className="rounded bg-ink-100 p-1 hover:bg-ink-200">
                    <Minus size={12} />
                  </button>
                  <span className="w-5 text-center">{i.qty}</span>
                  <button type="button" onClick={() => updateQty(i.menuId, 1)} className="rounded bg-ink-100 p-1 hover:bg-ink-200">
                    <Plus size={12} />
                  </button>
                </div>
                <span className="w-14 text-right font-semibold text-ink-900">Tk {i.qty * i.unitPrice}</span>
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-ink-400">No items yet.</p>}
          </div>
          <div className="flex justify-between border-t border-ink-100 pt-3 text-base font-bold text-ink-900">
            <span>Total</span>
            <span>Tk {total}</span>
          </div>
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            <Send size={16} /> Submit Order
          </button>
        </aside>
      </form>

      <OrderTokenModal open={!!confirmedOrder} order={confirmedOrder} onClose={closeTokenModal} />
    </div>
  );
}