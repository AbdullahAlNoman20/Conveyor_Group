// admin/src/pages/modules/manager/pages/Inventory.jsx
import { useEffect, useState } from "react";
import { Package, Plus, Save, AlertTriangle, Pencil, History } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "../../../../components/services/api";
import { useToast } from "../../../../components/hooks/useToast";
import { UNITS } from "../../../../components/shared/ItemPicker";
import Loader from "../../../../components/shared/Loader";
import Modal from "../../../../components/shared/Modal";
import StatCard from "../../../../components/shared/StatCard";
import DailyUsage from "../components/DailyUsage";
import UsageHistory from "../components/UsageHistory";

const TABS = [
  ["usage", "Used Today"],
  ["history", "Usage History"],
  ["stock", "In Stock"],
];

const EMPTY_ITEM = { id: null, name: "", unit: "kg", lowStockQty: 0, newQty: "", unitCost: "", note: "" };

export default function Inventory() {
  const { push } = useToast();

  const [tab, setTab] = useState("usage");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(null);
  const [savingItem, setSavingItem] = useState(false);
  const [history, setHistory] = useState(null);

  async function loadItems() {
    setItems(await apiGet("/kitchen/items").catch(() => []));
  }

  useEffect(() => {
    (async () => {
      await loadItems();
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loader full label="Loading store room..." />;

  const stockValue = items.reduce((s, i) => s + Number(i.stockValue || 0), 0);
  const lowStock = items.filter((i) => i.lowStock);

  async function openHistory(i) {
    try {
      setHistory({
        name: i.name,
        unit: i.unit,
        rows: await apiGet(`/kitchen/items/${i.id}/history`),
      });
    } catch (err) {
      push(err?.message || "Could not open the history.", "error");
    }
  }

  async function saveItem() {
    const name = editing.name.trim();
    if (!name) {
      push("Put the item name.", "error");
      return;
    }

    const newQty = editing.newQty === "" ? null : Number(editing.newQty);
    const unitCost = editing.unitCost === "" ? undefined : Number(editing.unitCost);
    const lowStockQty = Number(editing.lowStockQty) || 0;

    if (newQty !== null && (!Number.isFinite(newQty) || newQty < 0)) {
      push("The amount is not a valid number.", "error");
      return;
    }
    if (unitCost !== undefined && (!Number.isFinite(unitCost) || unitCost < 0)) {
      push("The rate is not a valid number.", "error");
      return;
    }

    setSavingItem(true);
    try {
      if (editing.id) {
        await apiPatch(`/kitchen/items/${editing.id}`, { name, unit: editing.unit, lowStockQty });

        // Stock fixes go through adjust, so a movement is written and the
        // change can always be explained later.
        const qtyChanged = newQty !== null && newQty !== editing.currentQty;
        if (qtyChanged || unitCost !== undefined) {
          await apiPost(`/kitchen/items/${editing.id}/adjust`, {
            newQty: newQty ?? editing.currentQty,
            unitCost,
            note: editing.note?.trim() || "Manual correction",
          });
        }
      } else {
        const created = await apiPost("/kitchen/items", { name, unit: editing.unit, lowStockQty });
        if (newQty > 0) {
          await apiPost(`/kitchen/items/${created.id}/adjust`, {
            newQty,
            unitCost,
            note: "Opening balance",
          });
        }
      }

      await loadItems();
      setEditing(null);
      push("Item saved.", "success");
    } catch (err) {
      push(err?.message || "Could not save that item.", "error");
    } finally {
      setSavingItem(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Store Room</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">
          Write down what the kitchen used each day. The day's food cost comes
          from this. You can also see what is left in stock.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Total Items" value={items.length} Icon={Package} accent="ink" />
        <StatCard label="Stock Value" value={`Tk ${Math.round(stockValue).toLocaleString()}`} accent="brand" />
        <StatCard
          label="Buy Soon"
          value={lowStock.length}
          Icon={AlertTriangle}
          accent={lowStock.length > 0 ? "amber" : "emerald"}
        />
      </div>

      {lowStock.length > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
          Buy soon: {lowStock.map((i) => `${i.name} (${i.currentQty} ${i.unit} left)`).join(", ")}.
        </p>
      )}

      <div className="grid w-full grid-cols-3 gap-1 rounded-lg bg-ink-50 p-1 sm:flex sm:w-fit">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-md px-2 py-2.5 text-xs font-semibold transition-colors sm:px-4 sm:py-2 sm:text-sm ${
              tab === key ? "bg-white text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "usage" ? (
        <DailyUsage items={items} onItemsChanged={loadItems} />
      ) : tab === "history" ? (
        <UsageHistory />
      ) : (
        <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink-700">In Stock ({items.length})</h2>
            <button
              type="button"
              onClick={() => setEditing({ ...EMPTY_ITEM })}
              className="flex min-h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white transition hover:bg-brand-700"
            >
              <Plus size={14} /> Add item
            </button>
          </div>

          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">No items yet. Add one above.</p>
          ) : (
            <>
              {/* Desktop / tablet */}
              <div className="hidden w-full overflow-x-auto sm:block">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-ink-50 text-xs uppercase text-ink-400">
                    <tr>
                      <th className="px-3 py-2.5">Item</th>
                      <th className="px-3 py-2.5 text-right">Left</th>
                      <th className="px-3 py-2.5 text-right">Rate</th>
                      <th className="px-3 py-2.5 text-right">Value</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {items.map((i) => (
                      <tr key={i.id} className={i.lowStock ? "bg-amber-50/40" : ""}>
                        <td className="max-w-[220px] truncate px-3 py-2.5 font-medium text-ink-800">{i.name}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right text-ink-600">
                          {i.currentQty} {i.unit}
                          {i.lowStock && <AlertTriangle size={12} className="ml-1 inline text-amber-600" />}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right text-ink-500">
                          Tk {i.avgUnitCost}/{i.unit}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-ink-900">
                          Tk {i.stockValue}
                        </td>
                        <td className="px-3 py-2.5">
                          <RowActions
                            onEdit={() => setEditing(toEditing(i))}
                            onHistory={() => openHistory(i)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phone */}
              <div className="space-y-2 sm:hidden">
                {items.map((i) => (
                  <div
                    key={i.id}
                    className={`flex min-w-0 items-center gap-2 rounded-lg p-3 ${
                      i.lowStock ? "bg-amber-50" : "bg-ink-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">{i.name}</p>
                      <p className="text-xs text-ink-500">
                        {i.currentQty} {i.unit} left, Tk {i.avgUnitCost}/{i.unit}
                      </p>
                      <p className="text-xs font-semibold text-ink-700">Tk {i.stockValue}</p>
                    </div>
                    <RowActions
                      onEdit={() => setEditing(toEditing(i))}
                      onHistory={() => openHistory(i)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Item editor */}
      <Modal
        open={!!editing}
        onClose={() => !savingItem && setEditing(null)}
        title={editing?.id ? "Edit Item" : "Add Item"}
        size="sm"
      >
        {editing && (
          <div className="space-y-3">
            <div>
              <label htmlFor="inv-name" className="mb-1 block text-xs font-semibold text-ink-700">
                Name
              </label>
              <input
                id="inv-name"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                maxLength={80}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-base outline-none focus:border-brand-500 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="inv-unit" className="mb-1 block text-xs font-semibold text-ink-700">
                  Unit
                </label>
                <select
                  id="inv-unit"
                  value={editing.unit}
                  onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-base outline-none focus:border-brand-500 sm:text-sm"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="inv-low" className="mb-1 block text-xs font-semibold text-ink-700">
                  Warn below
                </label>
                <input
                  id="inv-low"
                  type="number"
                  min="0"
                  step="0.001"
                  inputMode="decimal"
                  value={editing.lowStockQty}
                  onChange={(e) => setEditing({ ...editing, lowStockQty: e.target.value })}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-base outline-none focus:border-brand-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="inv-qty" className="mb-1 block text-xs font-semibold text-ink-700">
                  {editing.id ? "How much now" : "Starting amount"}
                </label>
                <input
                  id="inv-qty"
                  type="number"
                  min="0"
                  step="0.001"
                  inputMode="decimal"
                  value={editing.newQty}
                  onChange={(e) => setEditing({ ...editing, newQty: e.target.value })}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-base outline-none focus:border-brand-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="inv-rate" className="mb-1 block text-xs font-semibold text-ink-700">
                  Rate (Tk/{editing.unit})
                </label>
                <input
                  id="inv-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={editing.unitCost}
                  onChange={(e) => setEditing({ ...editing, unitCost: e.target.value })}
                  placeholder="Keep current"
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-base outline-none focus:border-brand-500 sm:text-sm"
                />
              </div>
            </div>

            <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs leading-5 text-ink-500">
              Always put the rate for a new item. Without it the item counts as
              Tk 0, and the day's food cost comes out wrong.
            </p>

            <button
              type="button"
              onClick={saveItem}
              disabled={savingItem || !editing.name.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              <Save size={16} /> {savingItem ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </Modal>

      {/* Movement history */}
      <Modal open={!!history} onClose={() => setHistory(null)} title={history?.name} size="md">
        {history && (
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead className="text-xs uppercase text-ink-400">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Type</th>
                  <th className="py-2 text-right">Change</th>
                  <th className="py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {history.rows.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap py-2 text-ink-500">
                      {new Date(m.date).toLocaleDateString()}
                    </td>
                    <td className="py-2 capitalize text-ink-700">{m.kind}</td>
                    <td
                      className={`whitespace-nowrap py-2 text-right font-semibold ${
                        m.qtyDelta >= 0 ? "text-emerald-600" : "text-brand-600"
                      }`}
                    >
                      {m.qtyDelta >= 0 ? "+" : ""}
                      {m.qtyDelta} {history.unit}
                    </td>
                    <td className="whitespace-nowrap py-2 text-right text-ink-500">
                      {m.balanceQty} {history.unit}
                    </td>
                  </tr>
                ))}

                {history.rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-ink-400">
                      Nothing here yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}

function toEditing(i) {
  return {
    id: i.id,
    name: i.name,
    unit: i.unit,
    lowStockQty: i.lowStockQty,
    currentQty: i.currentQty,
    newQty: String(i.currentQty),
    unitCost: "",
    note: "",
  };
}

function RowActions({ onEdit, onHistory }) {
  return (
    <div className="flex shrink-0 justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100"
        aria-label="Edit"
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        onClick={onHistory}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100"
        aria-label="History"
      >
        <History size={14} />
      </button>
    </div>
  );
}