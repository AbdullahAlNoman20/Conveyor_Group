// admin/src/pages/modules/manager/components/DailyUsage.jsx
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays, Plus, Trash2, Save, Wand2, AlertTriangle, Pencil, Check, X, Lock,
} from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../../components/services/api";
import { useToast } from "../../../../components/hooks/useToast";
import ItemPicker from "../../../../components/shared/ItemPicker";
import Loader from "../../../../components/shared/Loader";

const num = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));
const tk = (v) => `Tk ${Math.round(Number(v || 0)).toLocaleString()}`;
const EMPTY = { itemId: "", qty: "", note: "", auto: false, shortBy: 0 };

/**
 * Today's usage. Opens filled from today's dish and shopping list, so most
 * days it is a quick check. Today's entries can be changed or removed; once
 * the day is over they are locked by the server.
 */
export default function DailyUsage({ items, onItemsChanged }) {
  const { push } = useToast();

  const [date, setDate] = useState(null);
  const [mealName, setMealName] = useState(null);
  const [lines, setLines] = useState([]);
  const [recorded, setRecorded] = useState({ items: [], totalCost: 0, editable: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [editNote, setEditNote] = useState("");
  const [busyId, setBusyId] = useState(null);

  const byId = new Map(items.map((i) => [i.id, i]));

  // The server decides what "today" is, so this always matches its clock.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const suggest = await apiGet("/kitchen/consumption/suggest").catch(() => null);
      const d = suggest?.date ?? new Date().toLocaleDateString("en-CA");
      const done = await apiGet(`/kitchen/consumption?date=${d}`).catch(() => null);

      setDate(d);
      setMealName(suggest?.mealName ?? null);
      setRecorded(done || { items: [], totalCost: 0, editable: true });

      const auto = (suggest?.items ?? []).map((s) => ({
        itemId: s.itemId,
        qty: s.qty === null ? "" : String(s.qty),
        note: "",
        auto: true,
        shortBy: s.shortBy || 0,
      }));
      setLines(auto.length ? auto : [{ ...EMPTY }]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setLine(idx, patch) {
    setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  const addLine = () => setLines((rows) => [...rows, { ...EMPTY }]);
  const removeLine = (idx) =>
    setLines((rows) => (rows.length === 1 ? [{ ...EMPTY }] : rows.filter((_, i) => i !== idx)));

  const filled = lines.filter((l) => l.itemId && num(l.qty) > 0);
  const overStock = filled.filter((l) => num(l.qty) > (byId.get(l.itemId)?.currentQty ?? 0));
  const hasDuplicate = new Set(filled.map((l) => l.itemId)).size !== filled.length;
  const alreadySaved = new Set(recorded.items.map((r) => r.itemId).filter(Boolean));
  const estimate = filled.reduce(
    (s, l) => s + num(l.qty) * (byId.get(l.itemId)?.avgUnitCost ?? 0),
    0,
  );

  async function refreshAll() {
    await onItemsChanged?.();
    await load();
  }

  async function save() {
    if (!filled.length) return push("Put an amount for at least one item.", "error");
    if (hasDuplicate) return push("The same item is added twice. Keep it once.", "error");
    if (overStock.length) {
      const first = byId.get(overStock[0].itemId);
      return push(`Only ${first?.currentQty} ${first?.unit} of ${first?.name} is in stock.`, "error");
    }

    setSaving(true);
    try {
      const result = await apiPost("/kitchen/consumption", {
        usedDate: date,
        items: filled.map((l) => ({
          itemId: l.itemId,
          qty: Number(l.qty),
          note: l.note.trim().slice(0, 120) || undefined,
        })),
      });
      push(`Saved. ${tk(result?.totalCost)} of food used today.`, "success");
      await refreshAll();
    } catch (err) {
      push(err?.message || "Could not save the usage.", "error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(r) {
    setEditId(r.id);
    setEditQty(String(r.qty));
    setEditNote(r.note || "");
  }

  function cancelEdit() {
    setEditId(null);
    setEditQty("");
    setEditNote("");
  }

  async function saveEdit(r) {
    const q = num(editQty);
    if (!(q > 0)) return push("Put an amount above 0. To take it out, use remove.", "error");

    setBusyId(r.id);
    try {
      await apiPatch(`/kitchen/consumption/${r.id}`, {
        qty: q,
        note: editNote.trim().slice(0, 120),
      });
      push("Usage changed.", "success");
      cancelEdit();
      await refreshAll();
    } catch (err) {
      push(err?.message || "Could not change it.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id) {
    setBusyId(id);
    try {
      await apiDelete(`/kitchen/consumption/${id}`);
      push("Removed. The amount is back in stock.", "success");
      await refreshAll();
    } catch (err) {
      push(err?.message || "Could not remove it.", "error");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Loader label="Loading..." />;

  const dateLabel = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
        weekday: "long", day: "numeric", month: "short", year: "numeric",
      })
    : "";

  return (
    <div className="w-full min-w-0 space-y-5">
      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-ink-700">Used Today</h2>
            <p className="mt-0.5 text-xs leading-5 text-ink-500">
              Only today can be added or changed. Older days are in Usage History.
            </p>
          </div>
          <span className="flex w-fit items-center gap-1.5 rounded-lg bg-ink-50 px-3 py-2 text-xs font-semibold text-ink-700">
            <CalendarDays size={14} className="text-ink-400" /> {dateLabel}
          </span>
        </div>

        {mealName && lines.some((l) => l.auto) && (
          <p className="mt-4 flex items-start gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-xs leading-5 text-brand-700">
            <Wand2 size={13} className="mt-0.5 shrink-0" />
            <span>
              Filled in from <span className="font-semibold">{mealName}</span> and
              today's shopping list. Check the amounts and save.
            </span>
          </p>
        )}

        <div className="mt-4 space-y-2">
          {lines.map((line, idx) => {
            const item = byId.get(line.itemId);
            const q = num(line.qty);
            const tooMuch = item && q > item.currentQty;
            const dup = line.itemId && alreadySaved.has(line.itemId);

            return (
              <div
                key={idx}
                className={`rounded-lg border p-3 ${
                  tooMuch ? "border-amber-300 bg-amber-50/50" : "border-ink-100 bg-ink-50/50"
                }`}
              >
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <ItemPicker
                      items={items}
                      value={line.itemId}
                      onChange={(id) => setLine(idx, { itemId: id })}
                      onItemCreated={onItemsChanged}
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
                      aria-label="Amount used"
                      className="w-24 rounded-lg border border-ink-200 px-2 py-2 text-base outline-none focus:border-brand-500 sm:text-sm"
                    />
                    <span className="w-12 shrink-0 text-xs text-ink-500">{item?.unit ?? ""}</span>
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
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-400">
                    <span>{item.currentQty} {item.unit} in stock</span>
                    {q > 0 && item.avgUnitCost > 0 && (
                      <span className="font-semibold text-ink-600">About {tk(q * item.avgUnitCost)}</span>
                    )}
                    {tooMuch && (
                      <span className="flex items-center gap-1 font-semibold text-amber-700">
                        <AlertTriangle size={12} /> More than in stock
                      </span>
                    )}
                    {line.shortBy > 0 && !tooMuch && (
                      <span className="text-amber-700">
                        Planned {line.shortBy} {item.unit} more than you have
                      </span>
                    )}
                    {dup && (
                      <span className="font-semibold text-amber-700">
                        Already saved today, change it below instead
                      </span>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-ink-300 px-3 py-2 text-xs font-semibold text-ink-600 transition hover:border-brand-400 hover:text-brand-600"
        >
          <Plus size={14} /> Add item
        </button>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-ink-50 px-4 py-3">
          <span className="text-sm font-semibold text-ink-700">About</span>
          <span className="text-lg font-bold text-ink-900">{tk(estimate)}</span>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving || !filled.length}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save usage"}
        </button>
      </section>

      {/* Today's saved entries */}
      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-ink-700">Saved today</h3>
          <span className="text-sm font-bold text-brand-600">{tk(recorded.totalCost)}</span>
        </div>

        {recorded.items.length === 0 ? (
          <p className="rounded-lg bg-ink-50 px-3 py-6 text-center text-sm text-ink-400">
            Nothing saved yet today.
          </p>
        ) : (
          <div className="space-y-1.5">
            {recorded.items.map((r) => {
              const isEditing = editId === r.id;
              const busy = busyId === r.id;

              return (
                <div key={r.id} className="rounded-lg bg-ink-50 px-3 py-2">
                  {isEditing ? (
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink-800">{r.name}</p>
                      <div className="flex min-w-0 items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          inputMode="decimal"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          aria-label="New amount"
                          className="w-20 rounded-lg border border-ink-200 px-2 py-1.5 text-base outline-none focus:border-brand-500 sm:text-sm"
                        />
                        <span className="text-xs text-ink-500">{r.unit}</span>
                        <input
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          maxLength={120}
                          placeholder="Note"
                          aria-label="Note"
                          className="w-full min-w-0 flex-1 rounded-lg border border-ink-200 px-2 py-1.5 text-base outline-none focus:border-brand-500 sm:w-36 sm:text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => saveEdit(r)}
                          disabled={busy}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50"
                          aria-label="Save change"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={busy}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-500 transition hover:bg-ink-100"
                          aria-label="Cancel"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-800">{r.name}</p>
                        <p className="text-xs text-ink-400">
                          {r.qty} {r.unit} x Tk {r.unitCost}
                          {r.note && `, ${r.note}`}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-ink-700">{tk(r.cost)}</span>

                      {recorded.editable ? (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(r)}
                            disabled={busy}
                            title="Change"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-500 transition hover:bg-white disabled:opacity-50"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(r.id)}
                            disabled={busy}
                            title="Remove and put back in stock"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-white hover:text-brand-600 disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <Lock size={14} className="shrink-0 text-ink-300" aria-label="Locked" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}