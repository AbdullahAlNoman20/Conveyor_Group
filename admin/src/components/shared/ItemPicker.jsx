// admin/src/components/shared/ItemPicker.jsx
import { useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { apiPost } from "../services/api";
import { useToast } from "../hooks/useToast";

const UNITS = ["kg", "g", "litre", "ml", "piece", "dozen", "packet", "bundle"];

/**
 * Dropdown of known items with an "Other…" escape hatch.
 *
 * Choosing Other and naming the item saves it to the catalogue immediately, so
 * it is a normal dropdown choice from the next list onwards — the Manager
 * never has to type the same ingredient twice.
 */
export default function ItemPicker({ items, value, onChange, onItemCreated, className = "" }) {
  const { push } = useToast();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [saving, setSaving] = useState(false);

  async function createItem() {
    if (!name.trim()) {
      push("Type the item name first.", "error");
      return;
    }
    setSaving(true);
    try {
      const created = await apiPost("/kitchen/items", { name: name.trim(), unit });
      await onItemCreated?.();
      onChange(created.id);
      setAdding(false);
      setName("");
      setUnit("kg");
      push(`${created.name} added — it's in the dropdown now.`, "success");
    } catch (err) {
      push(err?.message || "Couldn't add that item.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (adding) {
    return (
      <div className={`flex min-w-0 flex-col gap-2 sm:flex-row ${className}`}>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createItem()}
          placeholder="New item name (e.g. Mustard Oil)"
          maxLength={80}
          className="min-w-0 flex-1 rounded-lg border border-brand-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />

        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="rounded-lg border border-ink-200 px-2 py-2 text-sm outline-none focus:border-brand-500 sm:w-28"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={createItem}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50"
            aria-label="Save item"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setName(""); }}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:bg-ink-50"
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <select
      value={value || ""}
      onChange={(e) => {
        if (e.target.value === "__other__") setAdding(true);
        else onChange(e.target.value);
      }}
      className={`w-full min-w-0 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${className}`}
    >
      <option value="">Select item…</option>
      {items.map((i) => (
        <option key={i.id} value={i.id}>
          {i.name} ({i.unit}) — {i.currentQty} in stock
        </option>
      ))}
      <option value="__other__">➕ Other — add a new item…</option>
    </select>
  );
}

export { UNITS };