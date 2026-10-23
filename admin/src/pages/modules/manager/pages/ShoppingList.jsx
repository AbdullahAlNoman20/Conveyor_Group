// admin/src/pages/modules/manager/pages/ShoppingList.jsx
import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Printer, ClipboardList, Eye, Wand2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "../../../../components/services/api";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import { useToast } from "../../../../components/hooks/useToast";
import ItemPicker, { UNITS } from "../../../../components/shared/ItemPicker";
import Loader from "../../../../components/shared/Loader";
import Badge from "../../../../components/shared/Badge";
import Modal from "../../../../components/shared/Modal";

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function ShoppingList() {
  const { push } = useToast();

  const [items, setItems] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [forDate, setForDate] = useState(tomorrow());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([]);
  const [mealName, setMealName] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);

  async function loadItems() {
    setItems(await apiGet("/kitchen/items").catch(() => []));
  }

  async function loadLists() {
    setLists(await apiGet("/kitchen/lists").catch(() => []));
  }

  useEffect(() => {
    (async () => {
      await Promise.all([loadItems(), loadLists()]);
      setLoading(false);
    })();
  }, []);

  /**
   * Fills the list from the dish planned for that day.
   *
   * Runs whenever the date changes on a new list, because that is the whole
   * point of recording ingredients on the planner. An existing list is left
   * alone, so opening one to edit never wipes what was typed.
   */
  useEffect(() => {
    if (loading || editingId) return;
    let mounted = true;

    apiGet(`/kitchen/lists/suggest?date=${forDate}`)
      .then((data) => {
        if (!mounted) return;
        setMealName(data.mealName || "");
        setLines(
          data.items.length
            ? data.items.map((i) => ({
                itemId: i.itemId,
                qty: i.qty,
                unit: i.unit,
                note: "",
              }))
            : [{ itemId: "", qty: "", unit: "", note: "" }],
        );
      })
      .catch(() => {
        if (mounted) setLines([{ itemId: "", qty: "", unit: "", note: "" }]);
      });

    return () => {
      mounted = false;
    };
  }, [forDate, editingId, loading]);

  if (loading) return <Loader full label="Loading..." />;

  const byId = new Map(items.map((i) => [i.id, i]));

  function setLine(idx, patch) {
    setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addLine() {
    setLines((rows) => [...rows, { itemId: "", qty: "", unit: "", note: "" }]);
  }

  function removeLine(idx) {
    setLines((rows) => (rows.length === 1 ? rows : rows.filter((_, i) => i !== idx)));
  }

  function resetForm() {
    setEditingId(null);
    setForDate(tomorrow());
    setNotes("");
    setLines([]);
  }

  async function openList(id, mode = "edit") {
    try {
      const list = await apiGet(`/kitchen/lists/${id}`);

      if (mode === "view") {
        setViewing(list);
        return;
      }

      setEditingId(list.status === "purchased" ? null : list.id);
      setForDate(list.forDate);
      setNotes(list.notes || "");
      setLines(
        list.items.length
          ? list.items.map((i) => ({
              itemId: i.itemId,
              qty: String(i.qty),
              unit: i.unit,
              note: i.note,
            }))
          : [{ itemId: "", qty: "", unit: "", note: "" }],
      );

      if (list.status === "purchased") {
        push("That list was already bought, so it opened as a copy.", "info");
      }
    } catch (err) {
      push(err?.message || "Could not open that list.", "error");
    }
  }

  const validLines = lines.filter((l) => l.itemId && Number(l.qty) > 0);

  async function save() {
    if (!validLines.length) {
      push("Put at least one item with an amount.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        forDate,
        notes,
        items: validLines.map((l) => ({
          itemId: l.itemId,
          qty: Number(l.qty),
          unit: l.unit || byId.get(l.itemId)?.unit,
          note: l.note || undefined,
        })),
      };

      if (editingId) await apiPut(`/kitchen/lists/${editingId}`, payload);
      else await apiPost("/kitchen/lists", payload);

      await loadLists();
      resetForm();
      push("List saved.", "success");
    } catch (err) {
      push(err?.message || "Could not save the list.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeList(id) {
    try {
      await apiDelete(`/kitchen/lists/${id}`);
      await loadLists();
      push("List deleted.", "success");
    } catch (err) {
      push(err?.message || "Could not delete that list.", "error");
    }
  }

  function printList(list) {
    printOnLetterhead({
      title: `Shopping List, ${list.forDate}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Market Shopping List</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">For ${list.forDate}</p>
        <table>
          <thead><tr><th>Item</th><th>Buy</th><th>In Stock</th><th>Note</th></tr></thead>
          <tbody>
            ${list.items
              .map(
                (i) =>
                  `<tr><td>${i.name}</td><td>${i.qty} ${i.unit}</td><td>${i.inStock} ${i.stockUnit}</td><td>${i.note || ""}</td></tr>`,
              )
              .join("")}
          </tbody>
        </table>
        ${list.notes ? `<div class="row"><span class="label">Notes</span><span>${list.notes}</span></div>` : ""}
        <div class="row total"><span>Items</span><span>${list.items.length}</span></div>
      `,
    });
  }

  async function printById(id) {
    try {
      printList(await apiGet(`/kitchen/lists/${id}`));
    } catch (err) {
      push(err?.message || "Could not print that list.", "error");
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Shopping List</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">
          Pick the day and the list fills itself in from the dish on the
          planner. Just put the amounts, and add anything extra you need.
        </p>
      </div>

      {/* Builder */}
      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink-700">
            <ClipboardList size={15} />
            {editingId ? "Edit List" : "New List"}
          </h2>

          {editingId && (
            <button
              onClick={resetForm}
              className="text-xs font-semibold text-ink-500 hover:text-brand-600"
            >
              Start a new list
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="forDate" className="mb-1 block text-xs font-semibold text-ink-700">
              Shopping for
            </label>
            <input
              id="forDate"
              type="date"
              value={forDate}
              onChange={(e) => setForDate(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label htmlFor="notes" className="mb-1 block text-xs font-semibold text-ink-700">
              Notes
            </label>
            <input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              placeholder="e.g. buy from Karwan Bazar"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {mealName && !editingId && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-xs leading-5 text-brand-700">
            <Wand2 size={13} className="shrink-0" />
            Filled in from <span className="font-semibold">{mealName}</span>, the
            dish planned for that day.
          </p>
        )}

        <div className="mt-4 space-y-2">
          {lines.map((line, idx) => {
            const item = byId.get(line.itemId);
            const unit = line.unit || item?.unit || "";

            return (
              <div key={idx} className="rounded-lg border border-ink-100 bg-ink-50/50 p-3">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <ItemPicker
                      items={items}
                      value={line.itemId}
                      onChange={(id) =>
                        setLine(idx, { itemId: id, unit: byId.get(id)?.unit || "" })
                      }
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
                      placeholder="Qty"
                      className="w-24 rounded-lg border border-ink-200 px-2 py-2 text-sm outline-none focus:border-brand-500"
                    />

                    {/* The unit is chosen per line, so a market list can be
                        written in grams for something stocked in kilograms. */}
                    <select
                      value={unit}
                      onChange={(e) => setLine(idx, { unit: e.target.value })}
                      className="w-24 rounded-lg border border-ink-200 px-2 py-2 text-sm outline-none focus:border-brand-500"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-600"
                      aria-label="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {item && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                    <span>
                      {item.currentQty} {item.unit} in stock
                    </span>
                    {item.avgUnitCost > 0 && (
                      <span>
                        Last Tk {item.avgUnitCost} per {item.unit}
                      </span>
                    )}
                    {/* Flagged rather than blocked: buying less than the recipe
                        asks for is a normal call to make at the market. */}
                    {Number(line.qty) > 0 && Number(line.qty) <= item.currentQty && (
                      <span className="font-medium text-emerald-600">
                        Enough in stock already
                      </span>
                    )}
                  </p>
                )}
              </div>
            );
          })}

          {lines.length === 0 && (
            <p className="rounded-lg bg-ink-50 px-3 py-6 text-center text-sm text-ink-400">
              No dish is planned for that day. Add the items by hand below.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-ink-300 px-3 py-2 text-xs font-semibold text-ink-600 transition hover:border-brand-400 hover:text-brand-600"
        >
          <Plus size={14} /> Add extra item
        </button>

        <button
          type="button"
          onClick={save}
          disabled={saving || !validLines.length}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
        >
          <Save size={16} />
          {saving ? "Saving..." : editingId ? "Update List" : "Save List"}
        </button>
      </section>

      {/* Saved lists */}
      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Saved Lists</h2>

        <div className="space-y-2">
          {lists.map((l) => (
            <div
              key={l.id}
              className="flex min-w-0 flex-col gap-2 rounded-lg bg-ink-50 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-ink-900">
                    {new Date(l.forDate).toLocaleDateString()}
                  </p>
                  <Badge tone={l.status === "purchased" ? "active" : "pending"}>
                    {l.status === "purchased" ? "bought" : "to buy"}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-400">
                  {l.itemCount} item{l.itemCount === 1 ? "" : "s"}
                  {l.notes && `, ${l.notes}`}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  onClick={() => openList(l.id, "view")}
                  className="flex min-h-9 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 text-xs font-semibold transition hover:bg-ink-50"
                >
                  <Eye size={13} /> View
                </button>

                <button
                  onClick={() => printById(l.id)}
                  className="flex min-h-9 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 text-xs font-semibold transition hover:bg-ink-50"
                >
                  <Printer size={13} /> Print
                </button>

                <button
                  onClick={() => openList(l.id)}
                  className="flex min-h-9 items-center rounded-lg border border-ink-200 bg-white px-3 text-xs font-semibold transition hover:bg-ink-50"
                >
                  {l.status === "purchased" ? "Copy" : "Edit"}
                </button>

                {l.status !== "purchased" && (
                  <button
                    onClick={() => removeList(l.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-400 transition hover:text-brand-600"
                    aria-label="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {lists.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-400">
              No lists yet. Make one above.
            </p>
          )}
        </div>
      </section>

      {/* Viewer */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `List for ${new Date(viewing.forDate).toLocaleDateString()}` : ""}
        size="lg"
      >
        {viewing && (
          <div className="space-y-4">
            {viewing.notes && <p className="text-sm text-ink-500">{viewing.notes}</p>}

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-ink-50 text-xs uppercase text-ink-400">
                  <tr>
                    <th className="px-3 py-2.5">Item</th>
                    <th className="px-3 py-2.5 text-right">Buy</th>
                    <th className="px-3 py-2.5 text-right">In Stock</th>
                    <th className="px-3 py-2.5 text-right">About</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {viewing.items.map((i) => (
                    <tr key={i.id}>
                      <td className="px-3 py-2.5 font-medium text-ink-800">{i.name}</td>
                      <td className="px-3 py-2.5 text-right text-ink-700">
                        {i.qty} {i.unit}
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-500">
                        {i.inStock} {i.stockUnit}
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-500">
                        Tk {i.estimatedCost}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => printList(viewing)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <Printer size={15} /> Print
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}