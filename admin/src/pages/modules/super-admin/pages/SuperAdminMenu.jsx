// FILE: src/pages/modules/super-admin/pages/SuperAdminMenu.jsx  (MODIFIED, full rewrite)
import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText, sanitizeNumber } from "../../../../components/utils/sanitize";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Modal from "../../../../components/shared/Modal";
import ConfirmDialog from "../../../../components/shared/ConfirmDialog";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";
import Loader from "../../../../components/shared/Loader";
import { DishImage } from "../../../../components/shared/DishImage";

const SPICE_LEVELS = ["Mild", "Medium", "Medium-Hot", "Hot"];

const EMPTY = {
  name: "",
  category: "Fixed Meal",
  price: "",
  image: "",
  description: "",
  calories: "",
  spiceLevel: "Mild",
  allergens: "",
};

/** "Fish Curry with Rice" -> "fish-curry-with-rice" — matches the naming
 * convention documented for public/assets/food/, so a freshly-added item
 * already points at the right filename the moment a photo is dropped in. */
function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function SuperAdminMenu() {
  const { push } = useToast();
  const [menu, setMenu] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    (async () => setMenu(await dataStore.load("menu", "menu.json")))();
  }, []);

  const { page, setPage, totalPages, pageItems: pagedMenu } = usePagination(menu || [], 9);

  if (!menu) return <Loader full label="Loading menu..." />;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }
  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      price: item.price,
      image: item.image || "",
      description: item.description || "",
      calories: item.calories ?? "",
      spiceLevel: item.spiceLevel || "Mild",
      allergens: (item.allergens || []).join(", "),
    });
    setModalOpen(true);
  }

  function onNameChange(name) {
    setForm((f) => ({
      ...f,
      name,
      // Only auto-fill the image path while creating and while the field
      // still matches the auto-suggestion — don't clobber a manual edit.
      image: !editing && (f.image === "" || f.image === `/assets/food/${slugify(f.name)}.svg`)
        ? `/assets/food/${slugify(name)}.svg`
        : f.image,
    }));
  }

  async function save(e) {
    e.preventDefault();
    const price = sanitizeNumber(form.price, { min: 0, max: 100000 });
    if (!form.name.trim() || price === null) {
      push("Name and a valid price are required.", "error");
      return;
    }
    const payload = {
      name: sanitizeText(form.name, 100),
      category: form.category,
      price,
      image: sanitizeText(form.image, 200) || "/assets/food/default.svg",
      description: sanitizeText(form.description, 400),
      calories: sanitizeNumber(form.calories, { min: 0, max: 5000 }) ?? undefined,
      spiceLevel: form.spiceLevel,
      allergens: form.allergens
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    };
    if (editing) {
      const next = await dataStore.update("menu", (m) => m.id === editing.id, payload);
      setMenu(next);
      push("Menu item updated.", "success");
    } else {
      const record = { id: genId("M"), available: true, ...payload };
      const next = await dataStore.insert("menu", record);
      setMenu(next);
      push("Menu item added.", "success");
    }
    setModalOpen(false);
  }

  async function toggleAvailable(item) {
    const next = await dataStore.update("menu", (m) => m.id === item.id, {
      available: !item.available,
    });
    setMenu(next);
  }

  async function confirmDelete() {
    const next = await dataStore.remove("menu", (m) => m.id === deleteTarget);
    setMenu(next);
    push("Menu item deleted.", "success");
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Menu Management</h1>
          <p className="text-sm text-ink-400">Add, edit, activate, or remove menu items — photo, calories, and description included.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Add Menu Item
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pagedMenu.map((m) => (
          <div key={m.id} className="overflow-hidden rounded-xl border border-ink-100 bg-white">
            <DishImage src={m.image} name={m.name} className="h-32" />
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-ink-900">{m.name}</p>
                  <p className="text-xs text-ink-400">{m.category} · {m.spiceLevel || "—"}</p>
                </div>
                <span className="font-bold text-brand-600">Tk {m.price}</span>
              </div>
              {m.description && <p className="mt-2 line-clamp-2 text-xs text-ink-500">{m.description}</p>}
              <p className="mt-1 text-[11px] text-ink-400">
                {m.calories ? `${m.calories} kcal` : "Calories not set"}
                {m.allergens?.length ? ` · Allergens: ${m.allergens.join(", ")}` : ""}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => toggleAvailable(m)}
                  className={`flex items-center gap-1 text-xs font-semibold ${
                    m.available ? "text-emerald-600" : "text-ink-400"
                  }`}
                >
                  {m.available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {m.available ? "Active" : "Inactive"}
                </button>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(m)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100">
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(m.id)}
                    className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Menu Item" : "Add Menu Item"}>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Food Name" required>
            <input
              value={form.name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <FormField label="Category" required>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option>Fixed Meal</option>
              <option>Custom Menu</option>
              <option>Beverage</option>
              <option>Evening Snack</option>
            </select>
          </FormField>
          <FormField label="Unit Price (Tk)" required>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <FormField label="Calories (kcal)">
            <input
              type="number"
              min="0"
              value={form.calories}
              onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <FormField label="Spice Level">
            <select
              value={form.spiceLevel}
              onChange={(e) => setForm((f) => ({ ...f, spiceLevel: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              {SPICE_LEVELS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Allergens" hint="Comma-separated, e.g. Egg, Fish">
            <input
              value={form.allergens}
              onChange={(e) => setForm((f) => ({ ...f, allergens: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField
              label="Image Path"
              hint="File under public/assets/food/ — auto-suggested from the name, edit if you saved it under a different filename."
            >
              <input
                value={form.image}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="/assets/food/dish-name.jpg"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
          </div>
          {form.image && (
            <div className="sm:col-span-2">
              <p className="mb-1 text-xs font-medium text-ink-500">Preview</p>
              <DishImage src={form.image} name={form.name} className="h-28 rounded-lg" rounded="rounded-lg" />
            </div>
          )}
          <div className="sm:col-span-2">
            <FormField label="Description">
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <button className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
              {editing ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this menu item?"
        message="This removes it from the ordering menu immediately."
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}