// FILE: src/pages/modules/super-admin/pages/SuperAdminMenu.jsx  (MODIFIED, full rewrite)
import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Image as ImageIcon } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText, sanitizeNumber } from "../../../../components/utils/sanitize";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";
import FormField from "../../../../components/shared/FormField";
import Modal from "../../../../components/shared/Modal";
import ConfirmDialog from "../../../../components/shared/ConfirmDialog";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";
import Loader from "../../../../components/shared/Loader";
import SearchInput from "../../../../components/shared/SearchInput";
import { DishImage } from "../../../../components/shared/DishImage";

const CATEGORIES = ["Fixed Meal", "Custom Menu", "Beverage", "Evening Snack"];
const SPICE_LEVELS = ["Mild", "Medium", "Medium-Hot", "Hot"];
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB — same client-side guard used for profile photos

const EMPTY = {
  name: "",
  category: "Fixed Meal",
  price: "",
  image: "", // data-URL from an uploaded photo, OR blank to use the auto name-matched asset
  description: "",
  calories: "",
  spiceLevel: "Mild",
  allergens: "",
};

export default function SuperAdminMenu() {
  const { push } = useToast();
  const [menu, setMenu] = useState(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toggleBusyId, setToggleBusyId] = useState(null); // per-row availability toggle animation

  useEffect(() => {
    (async () => setMenu(await dataStore.load("menu", "menu.json")))();
  }, []);

  const filtered = (menu || []).filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));
  const { page, setPage, totalPages, pageItems: pagedMenu } = usePagination(filtered, 9);

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

  // Lets an admin drop a real photo in for a dish instead of relying on the
  // src/assets/food/<slug>.* naming convention — stored as a data-URL in
  // this design/testing phase (no file-upload backend yet); a real backend
  // would upload this to storage and save a URL instead.
  function onPhotoChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      push("Please choose an image file.", "error");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      push("Image is too large — please choose one under 2MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
  }

  async function save(e) {
    e.preventDefault();
    const price = sanitizeNumber(form.price, { min: 0, max: 100000 });
    if (!form.name.trim() || price === null) {
      push("Name and a valid price are required.", "error");
      return;
    }
    setSaving(true);
    const payload = {
      name: sanitizeText(form.name, 100),
      category: form.category,
      price,
      image: form.image || "", // blank -> DishImage falls back to the name-matched asset automatically
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
    setSaving(false);
    setModalOpen(false);
  }

  async function toggleAvailable(item) {
    setToggleBusyId(item.id);
    const next = await dataStore.update("menu", (m) => m.id === item.id, {
      available: !item.available,
    });
    setMenu(next);
    setToggleBusyId(null);
  }

  async function confirmDelete() {
    setDeleteBusy(true);
    const next = await dataStore.remove("menu", (m) => m.id === deleteTarget);
    setMenu(next);
    push("Menu item deleted.", "success");
    setDeleteBusy(false);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Menu Management</h1>
          <p className="text-sm text-ink-400">
            Add, edit, activate, or remove menu items — photo, calories, and description included.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Search dish name..." />
          <Button variant="primary" icon={Plus} onClick={openCreate}>
            Add Menu Item
          </Button>
        </div>
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
                  disabled={toggleBusyId === m.id}
                  className={`flex items-center gap-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    m.available ? "text-emerald-600" : "text-ink-400"
                  }`}
                >
                  {m.available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {m.available ? "Active" : "Inactive"}
                </button>
                <div className="flex gap-1">
                  <Button variant="icon" onClick={() => openEdit(m)}>
                    <Edit2 size={14} />
                  </Button>
                  <Button
                    variant="icon"
                    className="hover:text-brand-600 hover:bg-brand-50"
                    onClick={() => setDeleteTarget(m.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-ink-400">No menu items found.</p>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Menu Item" : "Add Menu Item"}>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Food Name" required>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <FormField label="Category" required>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
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
            <label className="mb-1 block text-sm font-medium text-ink-700">Dish Photo</label>
            <div className="flex items-center gap-3">
              <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-ink-100 bg-ink-50">
                <DishImage src={form.image} name={form.name} className="h-20" rounded="" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:border-brand-300 hover:text-brand-600">
                    <ImageIcon size={13} /> Upload Photo
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={onPhotoChosen} />
                </label>
                <p className="text-[11px] text-ink-400">
                  JPG/PNG, under 2MB. Leave blank to auto-use a photo matching the dish name from
                  the shared asset library.
                </p>
                {form.image && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, image: "" }))}
                    className="w-fit text-[11px] font-semibold text-brand-600 hover:underline"
                  >
                    Remove uploaded photo
                  </button>
                )}
              </div>
            </div>
          </div>

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
            <Button type="submit" variant="primary" fullWidth loading={saving}>
              {editing ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this menu item?"
        message="This removes it from the ordering menu immediately, everywhere it's used (client ordering, manager New Order, weekly meal planner)."
        danger
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}