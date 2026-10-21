// admin/src/pages/modules/manager/pages/Inventory.jsx
import { useEffect, useState } from "react";
import {
  Package, Plus, Trash2, Save, AlertTriangle, Pencil, History, ChefHat,
} from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../../components/services/api";
import { useToast } from "../../../../components/hooks/useToast";
import ItemPicker, { UNITS } from "../../../../components/shared/ItemPicker";
import Loader from "../../../../components/shared/Loader";
import Modal from "../../../../components/shared/Modal";
import StatCard from "../../../../components/shared/StatCard";

const today = () => new Date().toISOString().slice(0, 10);

const TABS = [
  ["usage", "Used Today"],
  ["stock", "In Stock"],
];

export default function Inventory() {
  const { push } = useToast();

  const [tab, setTab] = useState("usage");
  const [items, setItems] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  const [usedDate, setUsedDate] = useState(today());
  const [lines, setLines] = useState([{ itemId: "", qty: "", note: "" }]);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState(null);

  async function loadItems() {
    setItems(await apiGet("/kitchen/items").catch(() => []));
  }

  async function loadUsage(date = usedDate) {
    setUsage(await apiGet(`/kitchen/consumption?date=${date}`).catch(() => null));
  }

  useEffect(() => {
    (async () => {
      await Promise.all([loadItems(), loadUsage()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadUsage(usedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usedDate]);

  if (loading) return <Loader full label="Loading inventory..." />;

  const byId = new Map(items.map((i) => [i.id, i]));
  const stockValue = items.reduce((s, i) => s + i.stockValue, 0);
  const lowStock = items.filter((i) => i.lowStock);

  const setLine = (idx, patch) =>
    setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addLine = () => setLines((rows) => [...rows, { itemId: "", qty: "", note: "" }]);
  const removeLine = (idx) =>
    setLines((rows) => (rows.length === 1 ? rows : rows.filter((_, i) => i !== idx)));

  const validLines = lines.filter((l) => l.itemId && Number(l.qty) > 0);
  const estimatedCost = validLines.reduce(
    (s, l) => s + Number(l.qty) * (byId.get(l.itemId)?.avgUnitCost ?? 0),
    0,
  );

  async function saveUsage() {
    if (!validLines.length) {
      push("Add at least one item that was used.", "error");
      return;
    }

    setSaving(true);
    try {
      const result = await apiPost("/kitchen/consumption", {
        usedDate,
        items: validLines.map((l) => ({
          itemId: l.itemId,
          qty: Number(l.qty),
          note: l.note || undefined,
        })),
      });
      await Promise.all([loadItems(), loadUsage()]);
      setLines([{ itemId: "", qty: "", note: "" }]);
      push(`Usage recorded — Tk ${result.totalCost} of ingredients.`, "success");
    } catch (err) {
      push(err?.message || "Couldn't record usage.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeUsage(id) {
    try {
      await apiDelete(`/kitchen/consumption/${id}`);
      await Promise.all([loadItems(), loadUsage()]);
      push("Entry reversed — stock put back.", "success");
    } catch (err) {
      push(err?.message || "Couldn't reverse that entry.", "error");
    }
  }

  async function saveItem() {
    try {
      if (editing.id) {
        await apiPatch(`/kitchen/items/${editing.id}`, {
          name: editing.name,
          unit: editing.unit,
          lowStockQty: Number(editing.lowStockQty) || 0,
        });

        // Stock corrections go through the adjust endpoint so a movement is
        // written and the change stays explainable.
        if (editing.newQty !== "" && Number(editing.newQty) !== editing.currentQty) {
          await apiPost(`/kitchen/items/${editing.id}/adjust`, {
            newQty: Number(editing.newQty),
            unitCost: editing.unitCost === "" ? undefined : Number(editing.unitCost),
            note: editing.note || "Manual correction",
          });
        }
      } else {
        const created = await apiPost("/kitchen/items", {
          name: editing.name,
          unit: editing.unit,
          lowStockQty: Number(editing.lowStockQty) || 0,
        });
        if (Number(editing.newQty) > 0) {
          await apiPost(`/kitchen/items/${created.id}/adjust`, {
            newQty: Number(editing.newQty),
            unitCost: editing.unitCost === "" ? undefined : Number(editing.unitCost),
            note: "Opening balance",
          });
        }
      }

      await loadItems();
      setEditing(null);
      push("Item saved.", "success");
    } catch (err) {
      push(err?.message || "Couldn't save that item.", "error");
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Store Room</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">
          Write down what the kitchen used today. The day's cost is worked out
          from this. You can also see what is left in stock.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Total Items" value={items.length} Icon={Package} accent="ink" />
        <StatCard label="Stock Value" value={`Tk ${stockValue.toLocaleString()}`} accent="brand" />
        <StatCard
          label="Buy Soon"
          value={lowStock.length}
          Icon={AlertTriangle}
          accent={lowStock.length > 0 ? "amber" : "emerald"}
        />
      </div>

      {lowStock.length > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
          Buy soon, {lowStock.map((i) => `${i.name} (${i.currentQty} ${i.unit} left)`).join(", ")}.
        </p>
      )}

      <div className="grid w-full grid-cols-2 gap-1 rounded-lg bg-ink-50 p-1 sm:flex sm:w-fit">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-colors sm:py-2 ${
              tab === key ? "bg-white text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "usage" ? (
        <>
          <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink-700">
                <ChefHat size={15} /> What the kitchen used
              </h2>

              <input
                type="date"
                value={usedDate}
                onChange={(e) => setUsedDate(e.target.value)}
                className="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>

            <div className="mt-4 space-y-2">
              {lines.map((line, idx) => {
                const item = byId.get(line.itemId);
                const over = item && Number(line.qty) > item.currentQty;

                return (
                  <div key={idx} className="rounded-lg border border-ink-100 bg-ink-50/50 p-3">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1">
                        <ItemPicker
                          items={items}
                          value={line.itemId}
                          onChange={(id) => setLine(idx, { itemId: id })}
                          onItemCreated={loadItems}
                        />
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          inputMode="decimal"
                          value={line.qty}
                          onChange={(e) => setLine(idx, { qty: e.target.value })}
                          placeholder="Used"
                          className="w-24 rounded-lg border border-ink-200 px-2 py-2 text-sm outline-none focus:border-brand-500"
                        />
                        <span className="w-10 shrink-0 text-xs text-ink-400">{item?.unit ?? ""}</span>
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-600"
                          aria-label="Remove line"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {item && (
                      <p className={`mt-2 text-xs ${over ? "font-medium text-brand-600" : "text-ink-400"}`}>
                        {over
                          ? `Not enough. Only ${item.currentQty} ${item.unit} left.`
                          : `${item.currentQty} ${item.unit} left, Tk ${item.avgUnitCost} per ${item.unit}.`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-ink-300 px-3 py-2 text-xs font-semibold text-ink-600 transition hover:border-brand-400 hover:text-brand-600"
              >
                <Plus size={14} /> Add item
              </button>

              {estimatedCost > 0 && (
                <p className="text-xs text-ink-500">
                  Cost: <span className="font-bold text-ink-800">Tk {Math.round(estimatedCost)}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={saveUsage}
              disabled={saving || !validLines.length}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save"}
            </button>
          </section>

          <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink-700">
                Recorded on {new Date(usedDate).toLocaleDateString()}
              </h2>
              <span className="text-sm font-bold text-brand-600">
                Tk {usage?.totalCost ?? 0}
              </span>
            </div>

            <div className="space-y-2">
              {(usage?.items ?? []).map((u) => (
                <div key={u.id} className="flex min-w-0 items-center gap-3 rounded-lg bg-ink-50 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink-800">{u.name}</p>
                    <p className="text-xs text-ink-400">
                      {u.qty} {u.unit} × Tk {u.unitCost}
                      {u.note && ` · ${u.note}`}
                    </p>
                  </div>

                  <span className="shrink-0 font-semibold text-ink-900">Tk {u.cost}</span>

                  <button
                    onClick={() => removeUsage(u.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-600"
                    aria-label="Reverse entry"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {!usage?.items?.length && (
                <p className="py-8 text-center text-sm text-ink-400">
                  Nothing saved for this day yet.
                </p>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink-700">In Stock ({items.length})</h2>
            <button
              onClick={() =>
                setEditing({ id: null, name: "", unit: "kg", lowStockQty: 0, newQty: "", unitCost: "", note: "" })
              }
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
            >
              <Plus size={14} /> Add item
            </button>
          </div>

          <div className="w-full overflow-x-auto">
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
                    <td className="px-3 py-2.5 font-medium text-ink-800">{i.name}</td>
                    <td className="px-3 py-2.5 text-right text-ink-600">
                      {i.currentQty} {i.unit}
                      {i.lowStock && (
                        <AlertTriangle size={12} className="ml-1 inline text-amber-600" />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-ink-500">Tk {i.avgUnitCost}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink-900">
                      Tk {i.stockValue}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() =>
                            setEditing({
                              id: i.id, name: i.name, unit: i.unit,
                              lowStockQty: i.lowStockQty, currentQty: i.currentQty,
                              newQty: String(i.currentQty), unitCost: "", note: "",
                            })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100"
                          aria-label="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={async () =>
                            setHistory({
                              name: i.name,
                              unit: i.unit,
                              rows: await apiGet(`/kitchen/items/${i.id}/history`),
                            })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100"
                          aria-label="History"
                        >
                          <History size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-ink-400">
                      No items yet — add one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Item editor */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit Item" : "Add Item"}
        size="sm"
      >
        {editing && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-700">Name</label>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                maxLength={80}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">Unit</label>
                <select
                  value={editing.unit}
                  onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">
                  Warn below
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={editing.lowStockQty}
                  onChange={(e) => setEditing({ ...editing, lowStockQty: e.target.value })}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">
                  {editing.id ? "How much now" : "Starting amount"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={editing.newQty}
                  onChange={(e) => setEditing({ ...editing, newQty: e.target.value })}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-700">
                  Rate (Tk/{editing.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editing.unitCost}
                  onChange={(e) => setEditing({ ...editing, unitCost: e.target.value })}
                  placeholder="Keep current"
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs leading-5 text-ink-500">
              Always put the rate. Without it the cost of this item counts as
              Tk 0, and the day's food cost comes out wrong.
            </p>

            <button
              onClick={saveItem}
              disabled={!editing.name.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              <Save size={16} /> Save
            </button>
          </div>
        )}
      </Modal>

      {/* Movement history */}
      <Modal open={!!history} onClose={() => setHistory(null)} title={history?.name} size="md">
        {history && (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
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
                    <td className="py-2 text-ink-500">
                      {new Date(m.date).toLocaleDateString()}
                    </td>
                    <td className="py-2 capitalize text-ink-700">{m.kind}</td>
                    <td
                      className={`py-2 text-right font-semibold ${
                        m.qtyDelta >= 0 ? "text-emerald-600" : "text-brand-600"
                      }`}
                    >
                      {m.qtyDelta >= 0 ? "+" : ""}{m.qtyDelta} {history.unit}
                    </td>
                    <td className="py-2 text-right text-ink-500">
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