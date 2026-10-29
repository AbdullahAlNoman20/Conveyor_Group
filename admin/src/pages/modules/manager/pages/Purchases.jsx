// admin/src/pages/modules/manager/pages/Purchases.jsx
import { useEffect, useRef, useState } from "react";
import {
  Plus, Trash2, Camera, Receipt, Save, Loader2, FileText, Truck, Printer,
} from "lucide-react";
import { apiGet, apiPost, uploadFile } from "../../../../components/services/api";
import { useToast } from "../../../../components/hooks/useToast";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import ItemPicker, { UNITS } from "../../../../components/shared/ItemPicker";
import DateRangePicker, { useDateRange } from "../../../../components/shared/DateRangePicker";
import Loader from "../../../../components/shared/Loader";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";
import Modal from "../../../../components/shared/Modal";

// Local date, not UTC, so a purchase at 1 AM in Dhaka is not filed under
// the day before.
const today = () => new Date().toLocaleDateString("en-CA");

const MAX_FILE_MB = 10;
const num = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));
const round2 = (v) => Math.round(v * 100) / 100;
const tk = (v) => `Tk ${Number(v || 0).toLocaleString()}`;

const EMPTY_LINE = { itemId: "", qty: "", unit: "", lineCost: "" };
const EMPTY_EXTRA = { label: "", amount: "" };

export default function Purchases() {
  const { push } = useToast();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const range = useDateRange("month");

  const [items, setItems] = useState([]);
  const [lists, setLists] = useState([]);
  const [history, setHistory] = useState([]);
  const [historySummary, setHistorySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [listId, setListId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [transportCost, setTransportCost] = useState("");
  const [extras, setExtras] = useState([]);

  const [voucherPreview, setVoucherPreview] = useState("");
  const [voucherName, setVoucherName] = useState("");
  const [voucherPath, setVoucherPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);
  // The list that was filled in by date, not picked by hand.
  const autoListRef = useRef("");

  async function loadItems() {
    setItems(await apiGet("/kitchen/items").catch(() => []));
  }

  async function loadLists() {
    const l = await apiGet("/kitchen/lists").catch(() => []);
    setLists(l.filter((x) => x.status === "draft"));
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const { from, to } = range.range;
      const data = await apiGet(`/kitchen/purchases?from=${from}&to=${to}`);
      // Works with both shapes: { items, summary } now, a plain array before.
      setHistory(Array.isArray(data) ? data : data?.items ?? []);
      setHistorySummary(Array.isArray(data) ? null : data?.summary ?? null);
    } catch {
      setHistory([]);
      setHistorySummary(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await Promise.all([loadItems(), loadLists()]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.range.from, range.range.to]);

  /** Fills the lines from a saved list, so only the prices need typing. */
  async function fillFromList(id, { auto = false } = {}) {
    setListId(id);
    autoListRef.current = auto ? id : "";
    if (!id) {
      setLines([{ ...EMPTY_LINE }]);
      return;
    }
    try {
      const list = await apiGet(`/kitchen/lists/${id}`);
      const units = new Map(items.map((i) => [i.id, i.unit]));
      setLines(
        list.items.length
          ? list.items.map((i) => ({
              itemId: i.itemId,
              qty: String(i.qty),
              unit: i.unit || units.get(i.itemId) || "",
              lineCost: "",
            }))
          : [{ ...EMPTY_LINE }],
      );
      push(
        auto
          ? `Filled from the list for ${new Date(`${list.forDate}T00:00:00`).toLocaleDateString()}. Put the prices.`
          : "List loaded. Now put what each item cost.",
        "info",
      );
    } catch (err) {
      push(err?.message || "Could not load that list.", "error");
    }
  }

  // Picks the list for the purchase date, or for the next day (people usually
  // shop the day before cooking). Never overwrites prices already typed.
  useEffect(() => {
    if (loading) return;
    const typedPrices = lines.some((l) => l.lineCost !== "");
    const handPicked = listId && listId !== autoListRef.current;
    const handTyped = !listId && lines.some((l) => l.itemId || l.qty !== "");
    if (typedPrices || handPicked || handTyped) return;

    const next = new Date(`${purchaseDate}T00:00:00`);
    next.setDate(next.getDate() + 1);
    const nextDay = next.toLocaleDateString("en-CA");

    const match =
      lists.find((l) => l.forDate === purchaseDate) || lists.find((l) => l.forDate === nextDay);

    if (match && match.id !== listId) fillFromList(match.id, { auto: true });
    else if (!match && listId && listId === autoListRef.current) fillFromList("", { auto: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseDate, lists, loading]);

  // Hooks stay above the early return below.
  const {
    page: historyPage,
    setPage: setHistoryPage,
    totalPages: historyPages,
    pageItems: pagedHistory,
  } = usePagination(history, 10);

  useEffect(() => {
    setHistoryPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.range.from, range.range.to]);

  if (loading) return <Loader full label="Loading..." />;

  const byId = new Map(items.map((i) => [i.id, i]));

  /* ── lines ─────────────────────────────────────────────────────────── */
  function setLine(idx, patch) {
    setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  const addLine = () => setLines((rows) => [...rows, { ...EMPTY_LINE }]);
  const removeLine = (idx) =>
    setLines((rows) => (rows.length === 1 ? [{ ...EMPTY_LINE }] : rows.filter((_, i) => i !== idx)));

  /* ── other costs ───────────────────────────────────────────────────── */
  function setExtra(idx, patch) {
    setExtras((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  const addExtra = () => setExtras((rows) => (rows.length >= 10 ? rows : [...rows, { ...EMPTY_EXTRA }]));
  const removeExtra = (idx) => setExtras((rows) => rows.filter((_, i) => i !== idx));



  /* ── voucher ───────────────────────────────────────────────────────── */
  function clearVoucher() {
    setVoucherPreview("");
    setVoucherName("");
    setVoucherPath("");
  }

  async function onVoucherChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf && !file.type.startsWith("image/")) {
      push("Only a photo or a PDF can be attached.", "error");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      push(`File is too big. Keep it under ${MAX_FILE_MB} MB.`, "error");
      return;
    }

    setVoucherName(file.name);
    if (isPdf) {
      setVoucherPreview("pdf");
    } else {
      const reader = new FileReader();
      reader.onload = () => setVoucherPreview(String(reader.result));
      reader.readAsDataURL(file);
    }

    setUploading(true);
    try {
      const { path } = await uploadFile("vouchers", file);
      setVoucherPath(path);
    } catch (err) {
      clearVoucher();
      push(err?.message || "Voucher upload failed.", "error");
    } finally {
      setUploading(false);
    }
  }

  /* ── totals ────────────────────────────────────────────────────────── */
  const validLines = lines.filter((l) => {
    const q = num(l.qty);
    const c = num(l.lineCost);
    return l.itemId && q > 0 && c >= 0;
  });
  const badLines = lines.filter(
    (l) => (l.itemId || l.qty !== "" || l.lineCost !== "") && !validLines.includes(l),
  );

  const goodsCost = round2(validLines.reduce((s, l) => s + Number(l.lineCost), 0));
  const transport = num(transportCost) >= 0 ? Number(transportCost) : 0;
  const validExtras = extras.filter((x) => num(x.amount) > 0);
  const otherTotal = round2(validExtras.reduce((s, x) => s + Number(x.amount), 0));
  const grandTotal = round2(goodsCost + transport + otherTotal);

  async function save() {
    if (!validLines.length) {
      push("Add at least one item with its amount and price.", "error");
      return;
    }
    if (badLines.length) {
      push("Some lines are not complete. Fill them or remove them.", "error");
      return;
    }
    if (transportCost !== "" && !(num(transportCost) >= 0)) {
      push("Transport cost is not a valid number.", "error");
      return;
    }
    if (extras.some((x) => x.amount !== "" && !(num(x.amount) >= 0))) {
      push("One of the other costs is not a valid number.", "error");
      return;
    }

    setSaving(true);
    try {
      await apiPost("/kitchen/purchases", {
        listId: listId || undefined,
        purchaseDate,
        voucherPath: voucherPath || undefined,
        notes: notes.trim() || undefined,
        transportCost: transport || undefined,
        extraCosts: validExtras.map((x) => ({
          label: x.label.trim().slice(0, 40) || undefined,
          amount: Number(x.amount),
        })),
        items: validLines.map((l) => ({
          itemId: l.itemId,
          qty: Number(l.qty),
          unit: l.unit || byId.get(l.itemId)?.unit,
          lineCost: Number(l.lineCost),
        })),
      });

      await Promise.all([loadItems(), loadLists(), loadHistory()]);
      setLines([{ ...EMPTY_LINE }]);
      setTransportCost("");
      setExtras([]);
      setListId("");
      autoListRef.current = "";
      setNotes("");
      clearVoucher();
      setPurchaseDate(today());
      push(`Saved. ${tk(grandTotal)} added to the store room.`, "success");
    } catch (err) {
      push(err?.message || "Could not save the purchase.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function openPurchase(id) {
    try {
      setViewing(await apiGet(`/kitchen/purchases/${id}`));
    } catch (err) {
      push(err?.message || "Could not open that purchase.", "error");
    }
  }

  function printPurchase(p) {
    printOnLetterhead({
      title: `Purchase, ${p.date}`,
      bodyHtml: `
        <h2 style="margin:0 0 4px">Purchase Voucher</h2>
        <p style="color:#595959;font-size:13px;margin:0 0 20px">
          ${new Date(p.date).toLocaleDateString()}${p.notes ? `, ${p.notes}` : ""}
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
        ${p.transportCost ? `<div class="row"><span class="label">Transport</span><span>Tk ${p.transportCost}</span></div>` : ""}
        ${p.otherCost ? `<div class="row"><span class="label">Other${p.otherCostLabel ? ` (${p.otherCostLabel})` : ""}</span><span>Tk ${p.otherCost}</span></div>` : ""}
        <div class="row total"><span>Total</span><span>Tk ${p.totalCost}</span></div>
      `,
    });
  }

  const historyTotal =
    historySummary?.totalCost ?? history.reduce((s, p) => s + Number(p.totalCost || 0), 0);

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Record Purchase</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">
          Put what you bought and what you paid. Transport and other costs are
          shared over the items, so the cost of one meal is the real cost.
        </p>
      </div>

      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        {/* Date + list */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="pdate" className="mb-1 block text-xs font-semibold text-ink-700">
              Purchase date
            </label>
            <input
              id="pdate"
              type="date"
              value={purchaseDate}
              max={today()}
              onChange={(e) => setPurchaseDate(e.target.value || today())}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:text-sm"
            />
          </div>

          <div className="min-w-0">
            <label htmlFor="fromList" className="mb-1 block text-xs font-semibold text-ink-700">
              From a shopping list (optional)
            </label>
            <select
              id="fromList"
              value={listId}
              onChange={(e) => fillFromList(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:text-sm"
            >
              <option value="">Not from a list</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  For {new Date(`${l.forDate}T00:00:00`).toLocaleDateString()}, {l.itemCount} items
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Voucher */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-ink-700">Voucher</p>

          {voucherPreview ? (
            <div className="flex min-w-0 items-center gap-3 rounded-lg border border-ink-100 bg-ink-50 p-3">
              {voucherPreview === "pdf" ? (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-400">
                  <FileText size={22} />
                </span>
              ) : (
                <img
                  src={voucherPreview}
                  alt="Voucher"
                  className="h-16 w-16 shrink-0 rounded-lg border border-ink-200 object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-ink-800">{voucherName}</p>
                <p className="text-xs text-ink-400">{uploading ? "Uploading..." : "Attached"}</p>
                {!uploading && (
                  <button
                    type="button"
                    onClick={clearVoucher}
                    className="mt-1 text-xs font-semibold text-brand-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
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
                <span className="text-xs font-semibold">Photo or PDF</span>
              </button>
            </div>
          )}

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
            accept="image/*,application/pdf,.pdf"
            className="hidden"
            onChange={onVoucherChosen}
          />
        </div>

        {/* Items */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold text-ink-700">Items bought</p>

          <div className="space-y-2">
            {lines.map((line, idx) => {
              const item = byId.get(line.itemId);
              const unit = line.unit || item?.unit || "";
              const q = num(line.qty);
              const c = num(line.lineCost);
              const rate = q > 0 && c >= 0 ? round2(c / q) : null;

              return (
                <div key={idx} className="rounded-lg border border-ink-100 bg-ink-50/50 p-3">
                  <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                      <ItemPicker
                        items={items}
                        value={line.itemId}
                        onChange={(id) => setLine(idx, { itemId: id, unit: byId.get(id)?.unit || "" })}
                        onItemCreated={loadItems}
                        newItemUnit={unit || "kg"}
                      />
                    </div>

                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 lg:flex lg:shrink-0">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        inputMode="decimal"
                        value={line.qty}
                        onChange={(e) => setLine(idx, { qty: e.target.value })}
                        placeholder="Qty"
                        aria-label="Quantity"
                        className="w-full min-w-0 rounded-lg border border-ink-200 px-2 py-2 text-base outline-none focus:border-brand-500 sm:text-sm lg:w-20"
                      />

                      <select
                        value={unit || "kg"}
                        onChange={(e) => setLine(idx, { unit: e.target.value })}
                        aria-label="Unit"
                        className="w-full min-w-0 rounded-lg border border-ink-200 px-2 py-2 text-base outline-none focus:border-brand-500 sm:text-sm lg:w-24"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={line.lineCost}
                        onChange={(e) => setLine(idx, { lineCost: e.target.value })}
                        placeholder="Paid Tk"
                        aria-label="Price paid"
                        className="w-full min-w-0 rounded-lg border border-ink-200 px-2 py-2 text-base outline-none focus:border-brand-500 sm:text-sm lg:w-28"
                      />

                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-600"
                        aria-label="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {item && (
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-400">
                      {rate !== null && unit && (
                        <span className="font-semibold text-ink-600">
                          Rate Tk {rate} per {unit}
                        </span>
                      )}
                      {item.avgUnitCost > 0 && (
                        <span>Last Tk {item.avgUnitCost} per {item.unit}</span>
                      )}
                      <span>
                        {item.currentQty} {item.unit} in stock
                      </span>
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
        </div>

        {/* Transport + other costs */}
        <div className="mt-5 space-y-2">
          <label htmlFor="transport" className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
            <Truck size={13} /> Transport cost
          </label>
          <input
            id="transport"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={transportCost}
            onChange={(e) => setTransportCost(e.target.value)}
            placeholder="Tk 0"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-base outline-none focus:border-brand-500 sm:max-w-xs sm:text-sm"
          />

          {extras.map((x, idx) => (
            <div key={idx} className="flex min-w-0 items-center gap-2">
              <input
                value={x.label}
                onChange={(e) => setExtra(idx, { label: e.target.value })}
                maxLength={40}
                placeholder="What for, e.g. Labour"
                aria-label="Other cost name"
                className="min-w-0 flex-1 rounded-lg border border-ink-200 px-3 py-2 text-base outline-none focus:border-brand-500 sm:max-w-xs sm:text-sm"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={x.amount}
                onChange={(e) => setExtra(idx, { amount: e.target.value })}
                placeholder="Tk"
                aria-label="Other cost amount"
                className="w-24 shrink-0 rounded-lg border border-ink-200 px-2 py-2 text-base outline-none focus:border-brand-500 sm:w-28 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => removeExtra(idx)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-600"
                aria-label="Remove other cost"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}

          {extras.length < 10 && (
            <button
              type="button"
              onClick={addExtra}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-ink-300 px-3 py-2 text-xs font-semibold text-ink-600 transition hover:border-brand-400 hover:text-brand-600"
            >
              <Plus size={14} /> Add other cost
            </button>
          )}
        </div>

        {/* Notes */}
        <div className="mt-5">
          <label htmlFor="pnotes" className="mb-1 block text-xs font-semibold text-ink-700">
            Notes (optional)
          </label>
          <input
            id="pnotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={300}
            placeholder="e.g. bought from Karwan Bazar"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:text-sm"
          />
        </div>

        {/* Totals. Worked out here, never typed, so it always matches the lines. */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Mini label="Goods" value={tk(goodsCost)} />
          <Mini label="Transport" value={tk(transport)} />
          <Mini label="Other" value={tk(otherTotal)} />
          <Mini label="Total" value={tk(grandTotal)} strong />
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving || uploading || !validLines.length}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
        >
          <Save size={16} />
          {saving ? "Saving..." : uploading ? "Wait, voucher uploading..." : "Save Purchase"}
        </button>
      </section>

      {/* History */}
      <section className="rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink-700">Purchases</h2>
          {history.length > 0 && (
            <span className="text-sm font-bold text-brand-600">{tk(historyTotal)}</span>
          )}
        </div>

        <DateRangePicker ctrl={range} className="mb-3" />

        {historyLoading ? (
          <Loader label="Loading..." />
        ) : (
          <div className="space-y-2">
            {pagedHistory.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openPurchase(p.id)}
                className="flex w-full min-w-0 items-center gap-3 rounded-lg bg-ink-50 p-3 text-left transition hover:bg-ink-100"
              >
                {p.voucher && !p.voucherIsPdf ? (
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
                    {p.notes && `, ${p.notes}`}
                  </p>
                </div>

                <span className="shrink-0 text-sm font-bold text-brand-600">{tk(p.totalCost)}</span>
              </button>
            ))}

            {history.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-400">
                No purchases for {range.label}.
              </p>
            )}

            <Pagination
              page={historyPage}
              totalPages={historyPages}
              onChange={setHistoryPage}
              className="pt-2"
            />
          </div>
        )}
      </section>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Purchase Details" size="md">
        {viewing && (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              {new Date(viewing.date).toLocaleDateString()}
              {viewing.notes && `, ${viewing.notes}`}
            </p>

            {viewing.voucher &&
              (viewing.voucherIsPdf ? (
                <a
                  href={viewing.voucher}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-ink-200 p-3 text-sm font-semibold text-brand-600 hover:bg-ink-50"
                >
                  <FileText size={16} /> Open voucher PDF
                </a>
              ) : (
                <img
                  src={viewing.voucher}
                  alt="Voucher"
                  className="max-h-72 w-full rounded-lg border border-ink-200 object-contain"
                />
              ))}

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[360px] text-left text-sm">
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
                      <td className="whitespace-nowrap py-2 text-right text-ink-500">
                        {i.qty} {i.unit}
                      </td>
                      <td className="whitespace-nowrap py-2 text-right text-ink-500">Tk {i.unitCost}</td>
                      <td className="whitespace-nowrap py-2 text-right font-semibold text-ink-900">
                        Tk {i.lineCost}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 border-t border-ink-100 pt-3 text-sm">
              <Row label="Goods" value={tk(viewing.goodsCost)} />
              {viewing.transportCost > 0 && <Row label="Transport" value={tk(viewing.transportCost)} />}
              {viewing.otherCost > 0 && (
                <Row
                  label={viewing.otherCostLabel ? `Other (${viewing.otherCostLabel})` : "Other"}
                  value={tk(viewing.otherCost)}
                />
              )}
              <div className="flex items-center justify-between pt-1 text-base font-bold text-ink-900">
                <span>Total</span>
                <span>{tk(viewing.totalCost)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => printPurchase(viewing)}
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

function Mini({ label, value, strong }) {
  return (
    <div className={`min-w-0 rounded-lg px-3 py-2 ${strong ? "bg-brand-50" : "bg-ink-50"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`truncate text-sm font-bold ${strong ? "text-brand-700" : "text-ink-900"}`}>
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <span className="min-w-0 break-words text-ink-500">{label}</span>
      <span className="shrink-0 font-semibold text-ink-800">{value}</span>
    </div>
  );
}