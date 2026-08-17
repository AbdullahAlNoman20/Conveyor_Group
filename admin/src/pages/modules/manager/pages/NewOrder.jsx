import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  Minus,
  Trash2,
  ClipboardPlus,
  Search,
  User,
  Users,
  X,
} from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { socket, SOCKET_EVENTS } from "../../../../components/services/socket";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText } from "../../../../components/utils/sanitize";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Loader from "../../../../components/shared/Loader";
import Pagination, {
  usePagination,
} from "../../../../components/shared/Pagination";
import DishImage from "../../../../components/shared/DishImage";
import OrderTokenModal from "../../../../components/shared/OrderTokenModal";
import { recordOrderEarning } from "../../../../components/services/earnings";

const ORDER_TYPES = ["Dine In", "Take Away", "Guest Order", "Corporate Guest"];
const PRIORITIES = ["Normal", "High", "VIP", "Urgent"];
const TAX_RATE = 0.05;

/**
 * SRS §13.4, updated per client request: instead of typing a client's name
 * by hand, the Manager searches/picks from every existing Client AND every
 * active Guest (Temporary / Walk-in / Corporate) in one combined list. A
 * manual-entry fallback stays available for a true one-off walk-in that was
 * never registered. Arriving here from Scan QR or from "Create Order" on the
 * Guest Management page pre-selects that person automatically.
 */
export default function NewOrder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { push } = useToast();
  const preloaded = location.state?.client || location.state?.guest || null;

  const [menu, setMenu] = useState(null);
  const [clients, setClients] = useState(null);
  const [guests, setGuests] = useState(null);
  const [weeklyMenu, setWeeklyMenu] = useState(null);

  const [pickerOpen, setPickerOpen] = useState(!preloaded);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(
    preloaded
      ? {
          kind: location.state?.guest ? "guest" : "client",
          name: preloaded.name,
          employeeId: preloaded.employeeId || "",
          department: preloaded.department || preloaded.company || "",
        }
      : null,
  );
  const [manualName, setManualName] = useState("");

  const [orderType, setOrderType] = useState("Dine In");
  const [tableNumber, setTableNumber] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [instructions, setInstructions] = useState("");
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  useEffect(() => {
    (async () => {
      setMenu(await dataStore.load("menu", "menu.json"));
      setClients(await dataStore.load("clients", "clients.json"));
      setGuests(await dataStore.load("guests", "guests.json"));
      setWeeklyMenu(await dataStore.load("weeklyMenu", "weekly-menu.json"));
    })();
  }, []);

  const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  // A selected CLIENT (not guest, not manual entry) whose profile has
  // "Fixed Company Meal" must get today's set meal locked in — the SRS
  // forbids letting them pick anything else. Guests always choose freely.
  const selectedClientRecord =
    selected?.kind === "client"
      ? (clients || []).find((c) => c.id === selected.id)
      : null;
  const isFixedMealClient =
    selectedClientRecord?.mealPlan === "Fixed Company Meal";
  const todayName = DAY_NAMES[new Date().getDay()];
  const fixedMealName =
    (weeklyMenu || []).find((d) => d.day === todayName)?.meal ||
    "Today's Set Meal";
  const fixedMealPrice =
    (menu || []).find((m) => m.name === fixedMealName)?.price ?? 0;

  const isTableRequired = orderType !== "Take Away";

  const pickerResults = useMemo(() => {
    if (!clients || !guests) return [];
    const q = search.trim().toLowerCase();
    const clientEntries = clients
      .filter((c) => c.status === "active")
      .map((c) => ({
        kind: "client",
        id: c.id,
        name: c.name,
        employeeId: c.employeeId,
        department: c.department,
        sub: `${c.employeeId} · ${c.department}`,
      }));
    const guestEntries = guests
      .filter((g) => g.status === "active")
      .map((g) => ({
        kind: "guest",
        id: g.id,
        name: g.name,
        employeeId: "",
        department: g.company || g.organization || "",
        sub: g.type,
      }));
    const all = [...clientEntries, ...guestEntries];
    if (!q) return all;
    return all.filter((p) => p.name.toLowerCase().includes(q));
  }, [clients, guests, search]);

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedResults,
  } = usePagination(pickerResults, 8);

  function pick(person) {
    setSelected(person);
    setManualName("");
    setPickerOpen(false);
    setSearch("");
  }

  function useManualEntry() {
    if (!manualName.trim()) return;
    setSelected({
      kind: "manual",
      name: manualName.trim(),
      employeeId: "",
      department: "",
    });
    setPickerOpen(false);
  }

  function addItem(menuItem) {
    if (isFixedMealClient) return; // locked — fixed-meal clients can't add anything else
    setItems((list) => {
      const existing = list.find((i) => i.menuId === menuItem.id);
      if (existing) {
        return list.map((i) =>
          i.menuId === menuItem.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [
        ...list,
        {
          menuId: menuItem.id,
          name: menuItem.name,
          qty: 1,
          unitPrice: menuItem.price,
        },
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

  function removeItem(menuId) {
    setItems((list) => list.filter((i) => i.menuId !== menuId));
  }

  const effectiveItems = isFixedMealClient
    ? [
        {
          menuId: "fixed",
          name: fixedMealName,
          qty: 1,
          unitPrice: fixedMealPrice,
        },
      ]
    : items;
  const subtotal = effectiveItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const discountAmount = Math.min(subtotal, Number(discount) || 0);
  const taxable = subtotal - discountAmount;
  const tax = Math.round(taxable * TAX_RATE);
  const grandTotal = taxable + tax;

  async function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!selected)
      nextErrors.client = "Pick a client or guest, or use manual entry.";
    if (isTableRequired && !tableNumber)
      nextErrors.tableNumber = "Table number is required for this order type.";
    if (effectiveItems.length === 0)
      nextErrors.items = "Add at least one menu item.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const order = {
      id: genId("ORD"),
      clientName: sanitizeText(
        selected.kind === "guest" ? `Guest - ${selected.name}` : selected.name,
        100,
      ),
      employeeId: sanitizeText(selected.employeeId, 30),
      department: sanitizeText(selected.department, 60),
      tableNumber: isTableRequired ? Number(tableNumber) : null,
      orderType: orderType.toLowerCase().replace(/\s+/g, "_"),
      priority: priority.toLowerCase(),
      specialInstructions: sanitizeText(instructions, 300),
      items: effectiveItems.map((i) => ({
        name: i.name,
        qty: i.qty,
        unitPrice: i.unitPrice,
      })),
      subtotal,
      discount: discountAmount,
      tax,
      amount: grandTotal,
      status: "pending", // Manager created it — already approved by definition
      createdAt: new Date().toISOString(),
    };

    await dataStore.insert("orders", order);
    await recordOrderEarning(order, clients); // NEW — manager-created order = already accepted
    socket.emit(SOCKET_EVENTS.ORDER_SUBMITTED, {
      orderId: order.id,
      message: `Order ${order.id} submitted.`,
      recipientRoles: ["kitchen_head"],
    });
    push(`Order ${order.id} created and sent to the kitchen.`, "success");
    setConfirmedOrder(order);
  }

  function closeTokenModal() {
    setConfirmedOrder(null);
    navigate("/app/manager");
  }

  if (!menu || !clients || !guests || !weeklyMenu)
    return <Loader full label="Loading menu..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">New Order</h1>
        <p className="text-sm text-ink-400">
          Pick a client or guest, add items, confirm — that's it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-ink-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold text-ink-700">
              Who is this order for?
            </h2>

            {selected && !pickerOpen ? (
              <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                    {selected.name.charAt(0)}
                  </span>
                  <div>
                    <p className="font-semibold text-ink-900">
                      {selected.name}
                    </p>
                    <p className="text-xs text-ink-500">
                      {selected.kind === "client" &&
                        `Client · ${selected.employeeId} · ${selected.department}`}
                      {selected.kind === "guest" &&
                        `Guest · ${selected.department || "Walk-in"}`}
                      {selected.kind === "manual" &&
                        "Manual entry (not in system)"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setPickerOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-600"
                >
                  <X size={14} /> Change
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                  />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search any client or guest by name..."
                    className="w-full rounded-lg border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                {errors.client && (
                  <p className="mt-1 text-xs font-medium text-brand-600">
                    {errors.client}
                  </p>
                )}

                <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                  {pagedResults.map((p) => (
                    <button
                      type="button"
                      key={`${p.kind}-${p.id}`}
                      onClick={() => pick(p)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-50"
                    >
                      <span className="flex items-center gap-2">
                        {p.kind === "client" ? (
                          <User size={14} className="text-ink-400" />
                        ) : (
                          <Users size={14} className="text-ink-400" />
                        )}
                        <span className="font-medium text-ink-800">
                          {p.name}
                        </span>
                      </span>
                      <span className="text-xs text-ink-400">{p.sub}</span>
                    </button>
                  ))}
                  {pickerResults.length === 0 && (
                    <p className="px-3 py-4 text-sm text-ink-400">
                      No matches — use manual entry below.
                    </p>
                  )}
                </div>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={setPage}
                />

                <div className="mt-3 flex gap-2 border-t border-ink-100 pt-3">
                  <input
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Or type a name for a one-off walk-in..."
                    className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    type="button"
                    onClick={useManualEntry}
                    className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50"
                  >
                    Use this name
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-ink-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold text-ink-700">
              Order Information
            </h2>
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
                hint={
                  !isTableRequired ? "Not required for Take Away." : undefined
                }
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
              <FormField label="Discount (Tk)" htmlFor="discount">
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
            <FormField label="Special Instructions" htmlFor="instructions">
              <textarea
                id="instructions"
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
          </section>

          <section className="rounded-xl border border-ink-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold text-ink-700">
              Menu Selection
            </h2>
            {errors.items && (
              <p className="mb-2 text-xs font-medium text-brand-600">
                {errors.items}
              </p>
            )}

            {isFixedMealClient ? (
              <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white">
                  <DishImage
                    name={fixedMealName}
                    className="h-full w-full object-cover"
                    rounded="rounded-xl"
                    height={56}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-800">{fixedMealName}</p>
                  <p className="truncate text-xs text-ink-400">
                    {selected.name.split(" ")[0]}'s Meal Plan is Fixed Company
                    Meal — locked to today's set meal.
                  </p>
                </div>
                <span className="shrink-0 font-bold text-brand-600">
                  Tk {fixedMealPrice}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {menu.map((m) => (
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
                      <span className="block truncate text-xs text-ink-400">
                        {m.category}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-brand-50 px-2 py-1.5 text-xs font-semibold text-brand-600">
                      <Plus size={14} /> Tk {m.price}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit space-y-4 self-start rounded-xl border border-ink-100 bg-white p-5 lg:sticky lg:top-20">
          <h2 className="text-sm font-bold text-ink-700">Order Summary</h2>
          <div className="space-y-2">
            {effectiveItems.length === 0 && (
              <p className="text-sm text-ink-400">No items added yet.</p>
            )}
            {effectiveItems.map((i) => (
              <div
                key={i.menuId}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex-1 truncate text-ink-700">{i.name}</span>
                {!isFixedMealClient && (
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
                )}
                <span className="w-16 text-right font-semibold text-ink-900">
                  Tk {i.qty * i.unitPrice}
                </span>
                {!isFixedMealClient && (
                  <button
                    type="button"
                    onClick={() => removeItem(i.menuId)}
                    className="text-ink-300 hover:text-brand-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-1 border-t border-ink-100 pt-3 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>Subtotal</span>
              <span>Tk {subtotal}</span>
            </div>
            <div className="flex justify-between text-ink-500">
              <span>Discount</span>
              <span>-Tk {discountAmount}</span>
            </div>
            <div className="flex justify-between text-ink-500">
              <span>Tax (5%)</span>
              <span>Tk {tax}</span>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold text-ink-900">
              <span>Grand Total</span>
              <span>Tk {grandTotal}</span>
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

      <OrderTokenModal
        open={!!confirmedOrder}
        order={confirmedOrder}
        onClose={closeTokenModal}
      />
    </div>
  );
}
