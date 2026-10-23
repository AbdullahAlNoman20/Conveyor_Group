// admin/src/pages/modules/super-admin/pages/IdCards.jsx
import { useEffect, useMemo, useState } from "react";
import { Printer, Search, CheckSquare, Square, IdCard as IdCardIcon } from "lucide-react";
import { apiGet } from "../../../../components/services/api";
import { useToast } from "../../../../components/hooks/useToast";
import IdCard from "../../../../components/shared/IdCard";
import PrintArea from "../../../../components/shared/PrintArea";
import Loader from "../../../../components/shared/Loader";

/**
 * Prints employee cards two to a row on A4.
 *
 * The cards are real components rather than generated HTML, so the printed
 * sheet is the same card the employee sees in the app, QR and all.
 */
export default function IdCards() {
  const { push } = useToast();

  const [cards, setCards] = useState(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [printing, setPrinting] = useState(null);

  useEffect(() => {
    apiGet("/clients/id-cards")
      .then(setCards)
      .catch((err) => {
        push(err?.message || "Could not load the cards.", "error");
        setCards([]);
      });
  }, [push]);

  const filtered = useMemo(() => {
    const list = cards || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.employeeId.toLowerCase().includes(q) ||
        (c.department || "").toLowerCase().includes(q),
    );
  }, [cards, query]);

  if (!cards) return <Loader full label="Loading cards..." />;

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id)),
    );
  }

  function printSelected() {
    const list = selected.size ? filtered.filter((c) => selected.has(c.id)) : filtered;
    if (!list.length) {
      push("No cards to print.", "error");
      return;
    }
    setPrinting(list);
  }

  // Printing takes over the whole page, so nothing else is rendered while the
  // dialog is open.
  if (printing) {
    return (
      <PrintArea onDone={() => setPrinting(null)}>
        <div className="grid grid-cols-2 gap-4">
          {printing.map((c) => (
            <IdCard key={c.id} client={c} size="compact" />
          ))}
        </div>
      </PrintArea>
    );
  }

  const allSelected = selected.size > 0 && selected.size === filtered.length;

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">ID Cards</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">
          Print employee cards, two to a page row on A4. Pick the ones you need,
          or print the whole list.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ID or department..."
            className="w-full rounded-lg border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            onClick={toggleAll}
            className="flex min-h-10 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold transition hover:bg-ink-50"
          >
            {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
            {allSelected ? "Clear" : "Select all"}
          </button>

          <button
            onClick={printSelected}
            className="flex min-h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-xs font-semibold text-white transition hover:bg-brand-700"
          >
            <Printer size={14} />
            Print {selected.size ? `${selected.size} selected` : `all ${filtered.length}`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.id} className="space-y-2">
            <IdCard client={c} size="compact" />

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => toggle(c.id)}
                className="flex items-center gap-1.5 text-xs font-semibold text-ink-600 transition hover:text-brand-600"
              >
                {selected.has(c.id) ? (
                  <CheckSquare size={14} className="text-brand-600" />
                ) : (
                  <Square size={14} />
                )}
                Select
              </button>

              <button
                onClick={() => setPrinting([c])}
                className="flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition hover:text-brand-600"
              >
                <Printer size={13} /> Print this one
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="col-span-full flex flex-col items-center gap-2 rounded-xl border border-dashed border-ink-200 py-12 text-center text-sm text-ink-400">
            <IdCardIcon size={24} className="text-ink-300" />
            No employees match that search.
          </p>
        )}
      </div>
    </div>
  );
}