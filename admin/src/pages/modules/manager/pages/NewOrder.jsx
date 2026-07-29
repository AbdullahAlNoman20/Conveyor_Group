import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Minus, Trash2, ClipboardPlus } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText } from "../../../../components/utils/sanitize";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Loader from "../../../../components/shared/Loader";

const ORDER_TYPES = ["Dine In", "Take Away", "Guest Order", "Corporate Guest"];
const PRIORITIES = ["Normal", "High", "VIP", "Urgent"];
const TAX_RATE = 0.05;

export default function NewOrder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { push } = useToast();
  const preloadedClient = location.state?.client;

  const [menu, setMenu] = useState(null);
  const [clientName, setClientName] = useState(preloadedClient?.name || "");
  const [employeeId, setEmployeeId] = useState(preloadedClient?.employeeId || "");
  const [department, setDepartment] = useState(preloadedClient?.department || "");
  const [orderType, setOrderType] = useState("Dine In");
  const [tableNumber, setTableNumber] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [instructions, setInstructions] = useState("");
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState([]); // { menuId, name, qty, unitPrice }
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => setMenu(await dataStore.load("menu", "menu.json")))();
  }, []);

  const isTableRequired = orderType !== "Take Away";

  function addItem(menuItem) {
    setItems((list) => {
      const existing = list.find((i) => i.menuId === menuItem.id);
      if (existing) {
        return list.map((i) => (i.menuId === menuItem.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...list, { menuId: menuItem.id, name: menuItem.name, qty: 1, unitPrice: menuItem.price }];
    });
  }

  function updateQty(menuId, delta) {
    setItems((list) =>
      list
        .map((i) => (i.menuId === menuId ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    );
  }

  function removeItem(menuId) {
    setItems((list) => list.filter((i) => i.menuId !== menuId));
  }

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const discountAmount = Math.min(subtotal, Number(discount) || 0);
  const taxable = subtotal - discountAmount;
  const tax = Math.round(taxable * TAX_RATE);
  const grandTotal = taxable + tax;

  async function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!clientName.trim()) nextErrors.clientName = "Client name is required.";
    if (isTableRequired && !tableNumber) nextErrors.tableNumber = "Table number is required for this order type.";
    if (items.length === 0) nextErrors.items = "Add at least one menu item.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const order = {
      id: genId("ORD"),
      clientName: sanitizeText(clientName, 100),
      employeeId: sanitizeText(employeeId, 30),
      department: sanitizeText(department, 60),
      tableNumber: isTableRequired ? Number(tableNumber) : null,
      orderType: orderType.toLowerCase().replace(/\s+/g, "_"),
      priority: priority.toLowerCase(),
      specialInstructions: sanitizeText(instructions, 300),
      items: items.map((i) => ({ name: i.name, qty: i.qty, unitPrice: i.unitPrice })),
      subtotal,
      discount: discountAmount,
      tax,
      amount: grandTotal,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    await dataStore.insert("orders", order);
    socket.emit(SOCKET_EVENTS.ORDER_SUBMITTED, { orderId: order.id, message: `Order ${order.id} submitted.` });
    push(`Order ${order.id} created and sent to the kitchen.`, "success");
    navigate("/app/manager");
  }

  if (!menu) return <Loader full label="Loading menu..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">New Order</h1>
        <p className="text-sm text-ink-400">Create an order for a scanned client, guest, or walk-in.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-ink-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold text-ink-700">Client Information</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Client Name" htmlFor="clientName" error={errors.clientName} required>
                <input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </FormField>
              <FormField label="Employee ID" htmlFor="employeeId">
                <input
                  id="employeeId"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </FormField>
              <FormField label="Department" htmlFor="department">
                <input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </FormField>
            </div>
          </section>

          <section className="rounded-xl border border-ink-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold text-ink-700">Order Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Order Type" htmlFor="orderType">
                <select
                  id="orderType"
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  {ORDER_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="Table Number"
                htmlFor="tableNumber"
                error={errors.tableNumber}
                required={isTableRequired}
                hint={!isTableRequired ? "Not required for Take Away." : undefined}
              >
                <input
                  id="tableNumber"
                  type="number"
                  min="1"
                  disabled={!isTableRequired}
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50 disabled:text-ink-300"
                />
              </FormField>
              <FormField label="Priority" htmlFor="priority">
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Discount (\u09F3)" htmlFor="discount">
                <input
                  id="discount"
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </FormField>
            </div>
            <FormField label="Special Instructions" htmlFor="instructions" className="mt-4">
              <textarea
                id="instructions"
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="mt-4 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
          </section>

          <section className="rounded-xl border border-ink-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold text-ink-700">Menu Selection</h2>
            {errors.items && <p className="mb-2 text-xs font-medium text-brand-600">{errors.items}</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              {menu.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => addItem(m)}
                  className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-left text-sm hover:border-brand-300 hover:bg-brand-50"
                >
                  <span>
                    <span className="block font-medium text-ink-800">{m.name}</span>
                    <span className="block text-xs text-ink-400">{m.category}</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-brand-600">
                    <Plus size={14} /> \u09F3{m.price}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-4 rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="text-sm font-bold text-ink-700">Order Summary</h2>
          <div className="space-y-2">
            {items.length === 0 && <p className="text-sm text-ink-400">No items added yet.</p>}
            {items.map((i) => (
              <div key={i.menuId} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex-1 truncate text-ink-700">{i.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateQty(i.menuId, -1)}
                    className="rounded bg-ink-100 p-1 hover:bg-ink-200"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-5 text-center">{i.qty}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(i.menuId, 1)}
                    className="rounded bg-ink-100 p-1 hover:bg-ink-200"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <span className="w-16 text-right font-semibold text-ink-900">
                  \u09F3{i.qty * i.unitPrice}
                </span>
                <button type="button" onClick={() => removeItem(i.menuId)} className="text-ink-300 hover:text-brand-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-1 border-t border-ink-100 pt-3 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>Subtotal</span>
              <span>\u09F3{subtotal}</span>
            </div>
            <div className="flex justify-between text-ink-500">
              <span>Discount</span>
              <span>-\u09F3{discountAmount}</span>
            </div>
            <div className="flex justify-between text-ink-500">
              <span>Tax (5%)</span>
              <span>\u09F3{tax}</span>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold text-ink-900">
              <span>Grand Total</span>
              <span>\u09F3{grandTotal}</span>
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <ClipboardPlus size={16} /> Confirm Order
          </button>
        </aside>
      </form>
    </div>
  );
}
