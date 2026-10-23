// admin/src/pages/modules/manager/pages/Purchases.jsx
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Camera, Receipt, Save, Loader2, FileText, Printer, Eye } from "lucide-react";
import { apiGet, apiPost, uploadFile } from "../../../../components/services/api";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import { useToast } from "../../../../components/hooks/useToast";
import ItemPicker, { UNITS } from "../../../../components/shared/ItemPicker";
import DateRangePicker, { useDateRange } from "../../../../components/shared/DateRangePicker";
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
  const [historySummary, setHistorySummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Defaults to the month, because a buyer checking what was spent is almost
  // always looking at a month rather than one day.
  const ctrl = useDateRange("month");

  const [listId, setListId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([{ itemId: "", qty: "", unit: "", lineCost: "" }]);
  const [transportCost, setTransportCost] = useState("");
  const [otherCost, setOtherCost] = useState("");
  const [otherCostLabel, setOtherCostLabel] = useState("");
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
      apiGet(`/kitchen/purchases?from=${ctrl.range.from}&to=${ctrl.range.to}`)
        .catch(() => ({ items: [], summary: null })),
    ]);
    setLists(l.filter((x) => x.status === "draft"));
    setHistory(h.items ?? []);
    setHistorySummary(h.summary ?? null);
  }

  useEffect(() => {
    (async () => {
      await Promise.all([loadItems(), refresh()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrl.range.from, ctrl.range.to]);

  if (loading) return <Loader full label="Loading purchases..." />;

  const byId = new Map(items.map((i) => [i.id, i]));

  function setLine(idx, patch) {
    setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  const addLine = () =>
    setLines((rows) => [...rows, { itemId: "", qty: "", unit: "", lineCost: "" }]);
  const removeLine = (idx) =>
    setLines((rows) => (rows.length === 1 ? rows : rows.filter((_, i) => i !== idx)));

  /** Pre-fills the lines from a saved list so only the prices need typing. */
  async function loadFromList(id) {
    setListId(id);
    if (!id) return;
    try {
      const list = await apiGet(`/kitchen/lists/${id}`);
      setLines(
        list.items.map((i) => ({
          itemId: i.itemId,
          qty: String(i.qty),
          unit: i.unit,
          lineCost: "",
          // Kept so the buyer can see what was planned against what they
          // actually came back with.
          plannedQty: i.qty,
          plannedUnit: i.unit,
        })),
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

  const goodsCost = validLines.reduce((s, l) => s + Number(l.lineCost), 0);
  const extraCost = (Number(transportCost) || 0) + (Number(otherCost) || 0);
  const totalCost = goodsCost + extraCost;

  function printVoucher(p) {
    printOnLetterhead({
      title: `Purchase Voucher, ${p.date}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Purchase Voucher</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">
          ${p.id}, ${new Date(p.date).toLocaleDateString()}
        </p>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Cost</th></tr></thead>
          <tbody>
            ${p.items
              .map(
                (i) =>
                  `<tr><td>${i.name}</td><td>${i.qty} ${i.unit}</td><td>Tk ${i.unitCost}</td><td>Tk ${i.lineCost}</td></tr>`,
              )
              .join("")}
          </tbody>
        </table>
        <div class="row"><span class="label">Goods</span><span>Tk ${p.goodsCost}</span></div>
        ${p.transportCost > 0 ? `<div class="row"><span class="label">Transport</span><span>Tk ${p.transportCost}</span></div>` : ""}
        ${p.otherCost > 0 ? `<div class="row"><span class="label">${p.otherCostLabel || "Other"}</span><span>Tk ${p.otherCost}</span></div>` : ""}
        ${p.notes ? `<div class="row"><span class="label">Notes</span><span>${p.notes}</span></div>` : ""}
        <div class="row total"><span>Total</span><span>Tk ${p.totalCost}</span></div>
      `,
    });
  }

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
        transportCost: Number(transportCost) || 0,
        otherCost: Number(otherCost) || 0,
        otherCostLabel: otherCostLabel || undefined,
        items: validLines.map((l) => ({
          itemId: l.itemId,
          qty: Number(l.qty),
          unit: l.unit || byId.get(l.itemId)?.unit,
          lineCost: Number(l.lineCost),
        })),
      });

      await Promise.all([loadItems(), refresh()]);
      setLines([{ itemId: "", qty: "", unit: "", lineCost: "" }]);
      setListId("");
      setNotes("");
      setTransportCost("");
      setOtherCost("");
      setOtherCostLabel("");
      setVoucherPreview("");
      setVoucherPath("");
      push(`Saved. Tk ${totalCost} added to the store room.`, "success");
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
                      className="w-20 rounded-lg border border-ink-200 px-2 py-2 text-sm outline-none focus:border-brand-500"
                    />

                    {/* The unit is converted on the server, so buying 500 g of
                        something stocked in kilograms adds 0.5, not 500. */}
                    <select
                      value={line.unit || item?.unit || ""}
                      onChange={(e) => setLine(idx, { unit: e.target.value })}
                      className="w-20 rounded-lg border border-ink-200 px-2 py-2 text-sm outline-none focus:border-brand-500"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>

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

                {/* The rate is worked out, not typed. Entering the total off
                    the voucher is what the buyer has in hand, and a per unit
                    figure typed by hand is a rounding error waiting to happen. */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {line.plannedQty != null && (
                    <span
                      className={
                        Number(line.qty) !== Number(line.plannedQty)
                          ? "font-medium text-amber-700"
                          : "text-ink-400"
                      }
                    >
                      Planned {line.plannedQty} {line.plannedUnit}
                    </span>
                  )}

                  {unitCost > 0 && (
                    <span className="font-semibold text-brand-600">
                      Tk {Math.round(unitCost)} per {line.unit || item?.unit}
                    </span>
                  )}

                  {item?.avgUnitCost > 0 && (
                    <span className="text-ink-400">
                      Last Tk {item.avgUnitCost} per {item.unit}
                    </span>
                  )}
                </div>
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

        {/* Delivery and any other charge on the voucher. They are spread
            across the items on the server, so the real cost of the food
            reaches the store room and the per meal figure. */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="transport" className="mb-1 block text-xs font-semibold text-ink-700">
              Transport cost
            </label>
            <input
              id="transport"
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={transportCost}
              onChange={(e) => setTransportCost(e.target.value)}
              placeholder="Tk 0"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label htmlFor="otherLabel" className="mb-1 block text-xs font-semibold text-ink-700">
              Other cost, what for
            </label>
            <input
              id="otherLabel"
              value={otherCostLabel}
              onChange={(e) => setOtherCostLabel(e.target.value)}
              maxLength={60}
              placeholder="e.g. loading charge"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label htmlFor="otherCost" className="mb-1 block text-xs font-semibold text-ink-700">
              Other cost
            </label>
            <input
              id="otherCost"
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={otherCost}
              onChange={(e) => setOtherCost(e.target.value)}
              placeholder="Tk 0"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* The total is worked out, never typed, so the voucher and the stock
            value cannot disagree. */}
        <div className="mt-4 space-y-1.5 rounded-lg bg-brand-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm text-ink-600">
            <span>Goods</span>
            <span className="font-semibold">Tk {goodsCost}</span>
          </div>

          {extraCost > 0 && (
            <div className="flex items-center justify-between text-sm text-ink-600">
              <span>Transport and other</span>
              <span className="font-semibold">Tk {extraCost}</span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-brand-200 pt-1.5">
            <span className="text-sm font-semibold text-ink-700">Total</span>
            <span className="text-xl font-bold text-brand-600">Tk {totalCost}</span>
          </div>
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
        <h2 className="mb-3 text-sm font-bold text-ink-700">Past Purchases</h2>

        <DateRangePicker ctrl={ctrl} />

        {historySummary && historySummary.count > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Mini label="Purchases" value={historySummary.count} />
            <Mini label="Goods" value={`Tk ${historySummary.goodsCost.toLocaleString()}`} />
            <Mini label="Transport" value={`Tk ${historySummary.transportCost.toLocaleString()}`} />
            <Mini label="Total" value={`Tk ${historySummary.totalCost.toLocaleString()}`} strong />
          </div>
        )}

        <div className="mt-3 space-y-2">
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
                  {p.transportCost > 0 && `, transport Tk ${p.transportCost}`}
                  {p.notes && `, ${p.notes}`}
                </p>
              </div>

              <span className="shrink-0 text-sm font-bold text-brand-600">
                Tk {p.totalCost}
              </span>

              <Eye size={14} className="shrink-0 text-ink-300" />
            </button>
          ))}

          {history.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-400">
              No purchases in this period.
            </p>
          )}
        </div>
      </section>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Purchase Details" size="md">
        {viewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-500">
                {new Date(viewing.date).toLocaleDateString()}
                {viewing.notes && `, ${viewing.notes}`}
              </p>

              <button
                onClick={() => printVoucher(viewing)}
                className="flex min-h-9 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold transition hover:bg-ink-50"
              >
                <Printer size={13} /> Print
              </button>
            </div>

            {/* A photographed receipt shows inline; a PDF invoice opens in a
                tab, because an embedded viewer is unreliable across browsers. */}
            {viewing.voucher && (
              viewing.voucherIsPdf ? (
                <a
                  href={viewing.voucher}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center justify-center gap-2 rounded-lg border border-ink-200 bg-ink-50 py-6 text-sm font-semibold text-brand-600 transition hover:bg-ink-100"
                >
                  <FileText size={16} /> Open the voucher PDF
                </a>
              ) : (
                <a href={viewing.voucher} target="_blank" rel="noreferrer noopener">
                  <img
                    src={viewing.voucher}
                    alt="Voucher"
                    className="max-h-72 w-full rounded-lg border border-ink-200 object-contain transition hover:opacity-90"
                  />
                </a>
              )
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

            <div className="space-y-1.5 border-t border-ink-100 pt-3 text-sm">
              <div className="flex items-center justify-between text-ink-600">
                <span>Goods</span>
                <span>Tk {viewing.goodsCost}</span>
              </div>

              {viewing.transportCost > 0 && (
                <div className="flex items-center justify-between text-ink-600">
                  <span>Transport</span>
                  <span>Tk {viewing.transportCost}</span>
                </div>
              )}

              {viewing.otherCost > 0 && (
                <div className="flex items-center justify-between text-ink-600">
                  <span>{viewing.otherCostLabel || "Other"}</span>
                  <span>Tk {viewing.otherCost}</span>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-ink-100 pt-1.5 text-base font-bold text-ink-900">
                <span>Total</span>
                <span>Tk {viewing.totalCost}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}