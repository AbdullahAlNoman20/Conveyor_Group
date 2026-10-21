// admin/src/pages/modules/manager/pages/Purchases.jsx
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Camera, Receipt, Save, Loader2, FileText } from "lucide-react";
import { apiGet, apiPost, uploadFile } from "../../../../components/services/api";
import { useToast } from "../../../../components/hooks/useToast";
import ItemPicker from "../../../../components/shared/ItemPicker";
import Loader from "../../../../components/shared/Loader";
import Modal from "../../../../components/shared/Modal";

const today = () => new Date().toISOString().slice(0, 10);

export default function Purchases() {
  const { push } = useToast();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const [items, setItems] = useState([]);
  const [lists, setLists] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [listId, setListId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([{ itemId: "", qty: "", lineCost: "" }]);
  const [voucherPreview, setVoucherPreview] = useState("");
  const [voucherPath, setVoucherPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);

  async function loadItems() {
    setItems(await apiGet("/kitchen/items").catch(() => []));
  }

  async function refresh() {
    const [l, h] = await Promise.all([
      apiGet("/kitchen/lists").catch(() => []),
      apiGet("/kitchen/purchases").catch(() => []),
    ]);
    setLists(l.filter((x) => x.status === "draft"));
    setHistory(h);
  }

  useEffect(() => {
    (async () => {
      await Promise.all([loadItems(), refresh()]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loader full label="Loading purchases..." />;

  const byId = new Map(items.map((i) => [i.id, i]));

  function setLine(idx, patch) {
    setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  const addLine = () => setLines((rows) => [...rows, { itemId: "", qty: "", lineCost: "" }]);
  const removeLine = (idx) =>
    setLines((rows) => (rows.length === 1 ? rows : rows.filter((_, i) => i !== idx)));

  /** Pre-fills the lines from a saved list so only the prices need typing. */
  async function loadFromList(id) {
    setListId(id);
    if (!id) return;
    try {
      const list = await apiGet(`/kitchen/lists/${id}`);
      setLines(
        list.items.map((i) => ({ itemId: i.itemId, qty: String(i.qty), lineCost: "" })),
      );
      push("List loaded. Now put in the price of each item.", "info");
    } catch (err) {
      push(err?.message || "Couldn't load that list.", "error");
    }
  }

  async function onVoucherChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setVoucherPreview(reader.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const { path } = await uploadFile("vouchers", file);
      setVoucherPath(path);
    } catch (err) {
      setVoucherPreview("");
      push(err?.message || "Voucher upload failed.", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const validLines = lines.filter(
    (l) => l.itemId && Number(l.qty) > 0 && l.lineCost !== "" && Number(l.lineCost) >= 0,
  );
  const totalCost = validLines.reduce((s, l) => s + Number(l.lineCost), 0);

  async function save() {
    if (!validLines.length) {
      push("Add at least one item with a quantity and its cost.", "error");
      return;
    }

    setSaving(true);
    try {
      await apiPost("/kitchen/purchases", {
        listId: listId || undefined,
        purchaseDate,
        voucherPath: voucherPath || undefined,
        notes: notes || undefined,
        items: validLines.map((l) => ({
          itemId: l.itemId,
          qty: Number(l.qty),
          lineCost: Number(l.lineCost),
        })),
      });

      await Promise.all([loadItems(), refresh()]);
      setLines([{ itemId: "", qty: "", lineCost: "" }]);
      setListId("");
      setNotes("");
      setVoucherPreview("");
      setVoucherPath("");
      push(`Purchase recorded  Tk ${totalCost} added to stock.`, "success");
    } catch (err) {
      push(err?.message || "Couldn't record the purchase.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Add Purchase</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">
          Put in what you bought and the price of each item. It goes into stock
          right away. The prices are used to work out the cost of one meal.
        </p>
      </div>

      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="pdate" className="mb-1 block text-xs font-semibold text-ink-700">
              Purchase date
            </label>
            <input
              id="pdate"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label htmlFor="fromList" className="mb-1 block text-xs font-semibold text-ink-700">
              From a shopping list (optional)
            </label>
            <select
              id="fromList"
              value={listId}
              onChange={(e) => loadFromList(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Not from a list</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {new Date(l.forDate).toLocaleDateString()} — {l.itemCount} items
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Voucher */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-ink-700">Voucher photo</p>

          {voucherPreview ? (
            <div className="flex items-center gap-3 rounded-lg border border-ink-100 bg-ink-50 p-3">
              <img
                src={voucherPreview}
                alt="Voucher"
                className="h-20 w-20 shrink-0 rounded-lg border border-ink-200 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink-800">
                  {uploading ? "Uploading…" : "Attached"}
                </p>
                <button
                  onClick={() => { setVoucherPreview(""); setVoucherPath(""); }}
                  className="mt-1 text-xs font-semibold text-brand-600 hover:underline"
                >
                  Remove
                </button>
              </div>
              {uploading && <Loader2 size={18} className="shrink-0 animate-spin text-ink-400" />}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink-200 text-ink-500 transition hover:border-brand-400 hover:text-brand-600"
              >
                <Camera size={20} />
                <span className="text-xs font-semibold">Take photo</span>
              </button>

              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink-200 text-ink-500 transition hover:border-brand-400 hover:text-brand-600"
              >
                <Receipt size={20} />
                <span className="text-xs font-semibold">Choose file</span>
              </button>
            </div>
          )}

          {/* capture="environment" opens the rear camera straight away on a phone. */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onVoucherChosen}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={onVoucherChosen}
          />
        </div>

        {/* Lines */}
        <div className="mt-4 space-y-2">
          {lines.map((line, idx) => {
            const item = byId.get(line.itemId);
            const qty = Number(line.qty);
            const unitCost = qty > 0 && line.lineCost !== "" ? Number(line.lineCost) / qty : 0;

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
                      placeholder="Qty"
                      className="w-20 rounded-lg border border-ink-200 px-2 py-2 text-sm outline-none focus:border-brand-500"
                    />

                    <span className="w-10 shrink-0 text-xs text-ink-400">
                      {item?.unit ?? ""}
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="decimal"
                      value={line.lineCost}
                      onChange={(e) => setLine(idx, { lineCost: e.target.value })}
                      placeholder="Tk"
                      className="w-24 rounded-lg border border-ink-200 px-2 py-2 text-sm outline-none focus:border-brand-500"
                    />

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

                {item && unitCost > 0 && (
                  <p className="mt-2 text-xs text-ink-400">
                    Tk {Math.round(unitCost)}/{item.unit}
                    {item.avgUnitCost > 0 && ` · previous avg Tk ${item.avgUnitCost}/${item.unit}`}
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

        <div className="mt-4">
          <label htmlFor="pnotes" className="mb-1 block text-xs font-semibold text-ink-700">
            Notes (optional)
          </label>
          <input
            id="pnotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={300}
            placeholder="e.g. extra items bought beyond the list"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Total is derived, never typed — the voucher and the stock valuation
            can't disagree this way. */}
          <div className="flex items-center justify-between rounded-lg bg-brand-50 px-4 py-3">
            <span className="text-sm font-semibold text-ink-700">Total</span>
          <span className="text-xl font-bold text-brand-600">Tk {totalCost}</span>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving || uploading || !validLines.length}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save and Add to Stock"}
        </button>
      </section>

      {/* History */}
      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-ink-700">Recent Purchases</h2>

        <div className="space-y-2">
          {history.map((p) => (
            <button
              key={p.id}
              onClick={async () => setViewing(await apiGet(`/kitchen/purchases/${p.id}`))}
              className="flex w-full min-w-0 items-center gap-3 rounded-lg bg-ink-50 p-3 text-left transition hover:bg-ink-100"
            >
              {p.voucher ? (
                <img
                  src={p.voucher}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded border border-ink-200 object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-ink-200 bg-white text-ink-300">
                  <FileText size={16} />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">
                  {new Date(p.date).toLocaleDateString()}
                </p>
                <p className="truncate text-xs text-ink-400">
                  {p.itemCount} item{p.itemCount === 1 ? "" : "s"}
                  {p.notes && ` · ${p.notes}`}
                </p>
              </div>

              <span className="shrink-0 text-sm font-bold text-brand-600">
                Tk {p.totalCost}
              </span>
            </button>
          ))}

          {history.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-400">No purchases yet.</p>
          )}
        </div>
      </section>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Purchase Details" size="md">
        {viewing && (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              {new Date(viewing.date).toLocaleDateString()}
              {viewing.notes && ` · ${viewing.notes}`}
            </p>

            {viewing.voucher && (
              <img
                src={viewing.voucher}
                alt="Voucher"
                className="max-h-72 w-full rounded-lg border border-ink-200 object-contain"
              />
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[380px] text-left text-sm">
                <thead className="text-xs uppercase text-ink-400">
                  <tr>
                    <th className="py-2">Item</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {viewing.items.map((i, idx) => (
                    <tr key={idx}>
                      <td className="py-2 text-ink-800">{i.name}</td>
                      <td className="py-2 text-right text-ink-500">{i.qty} {i.unit}</td>
                      <td className="py-2 text-right text-ink-500">Tk {i.unitCost}</td>
                      <td className="py-2 text-right font-semibold text-ink-900">Tk {i.lineCost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-ink-100 pt-3 text-base font-bold text-ink-900">
              <span>Total</span>
              <span>Tk {viewing.totalCost}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}