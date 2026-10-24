// admin/src/components/shared/ItemPicker.jsx
import { useRef, useState } from "react";
import { apiPost } from "../services/api";
import { useToast } from "../hooks/useToast";

const UNITS = ["kg", "g", "litre", "ml", "piece", "dozen", "packet", "bundle"];

/**
 * Dropdown of known items with an "Other" option.
 *
 * Choosing Other shows a name box. The new item is stored in `newItemUnit`,
 * which is the unit already picked on the same line, so the row never shows
 * two unit dropdowns. Saved on Enter or when you click outside. Esc, or an
 * empty name, goes back to the dropdown.
 */
export default function ItemPicker({
  items,
  value,
  onChange,
  onItemCreated,
  newItemUnit = "kg",
  className = "",
}) {
  const { push } = useToast();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const busy = useRef(false);

  function cancel() {
    setAdding(false);
    setName("");
  }

  async function commit() {
    const clean = name.trim();
    if (!clean) {
      cancel();
      return;
    }
    if (busy.current) return;
    busy.current = true;

    try {
      const unit = UNITS.includes(newItemUnit) ? newItemUnit : "kg";
      const created = await apiPost("/kitchen/items", { name: clean.slice(0, 80), unit });
      await onItemCreated?.();
      onChange(created.id);
      push(`${created.name} added to the list.`, "success");
      cancel();
    } catch (err) {
      push(err?.message || "Could not add that item.", "error");
    } finally {
      busy.current = false;
    }
  }

  if (adding) {
    return (
      <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              cancel();
            }
          }}
          placeholder="New item name, e.g. Mustard Oil"
          maxLength={80}
          className="w-full min-w-0 rounded-lg border border-brand-300 px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:text-sm"
        />
        <p className="text-[11px] text-ink-400">
          Pick the unit on the right first. Press Enter to add, Esc to go back.
        </p>
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
      className={`w-full min-w-0 rounded-lg border border-ink-200 px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:text-sm ${className}`}
    >
      <option value="">Select item</option>
      {items.map((i) => (
        <option key={i.id} value={i.id}>
          {i.name} ({i.unit}), {i.currentQty} in stock
        </option>
      ))}
      <option value="__other__">+ Other, add a new item</option>
    </select>
  );
}

export { UNITS };