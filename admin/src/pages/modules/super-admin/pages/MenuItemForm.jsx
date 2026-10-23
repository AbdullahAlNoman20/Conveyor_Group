// admin/src/pages/modules/super-admin/pages/MenuItemForm.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, UtensilsCrossed, Plus, Trash2, Soup } from "lucide-react";
import { apiGet, apiPut } from "../../../../components/services/api";
import { dataStore } from "../../../../components/services/dataStore";
import { sanitizeText } from "../../../../components/utils/sanitize";
import { useToast } from "../../../../components/hooks/useToast";
import FileUpload from "../../../../components/shared/FileUpload";
import ItemPicker from "../../../../components/shared/ItemPicker";
import Button from "../../../../components/shared/Button";
import Loader from "../../../../components/shared/Loader";

// These must match what every other screen filters on, and the database
// constraint. The old list produced dishes that were invisible everywhere.
const CATEGORIES = ["Fixed Meal", "Custom Menu", "Beverage", "Evening Snack"];
const SPICE_LEVELS = ["-", "Mild", "Medium", "Medium-Hot", "Hot"];

const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;

const EMPTY_FORM = {
  name: "",
  category: CATEGORIES[0],
  price: "",
  spiceLevel: SPICE_LEVELS[0],
  description: "",
  image: "",        // Supabase object path, only set on a fresh upload
  previewUrl: "",   // signed URL, display only, never saved
  imageName: "",
  available: true,
  calories: null,
  allergens: [],
};

export default function MenuItemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();

  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [ingredients, setIngredients] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  async function loadStockItems() {
    setStockItems(await apiGet("/kitchen/items").catch(() => []));
  }

  useEffect(() => {
    (async () => {
      await loadStockItems();

      if (!isEdit) {
        setLoading(false);
        return;
      }

      const menu = await dataStore.load("menu");
      const existing = menu.find((m) => String(m.id) === String(id));

      if (existing) {
        setForm({
          name: existing.name ?? "",
          category: CATEGORIES.includes(existing.category) ? existing.category : CATEGORIES[0],
          price: existing.price != null ? String(existing.price) : "",
          spiceLevel: SPICE_LEVELS.includes(existing.spiceLevel)
            ? existing.spiceLevel
            : SPICE_LEVELS[0],
          description: existing.description ?? "",
          // `existing.image` is a signed URL that expires in minutes. Saving it
          // back as the path would permanently break the photo, so the preview
          // and the stored path are kept apart.
          previewUrl: existing.image ?? "",
          image: "",
          imageName: existing.imageName ?? "",
          available: existing.available ?? true,
          calories: existing.calories ?? null,
          allergens: existing.allergens ?? [],
        });

        setIngredients(await apiGet(`/menu/${id}/ingredients`).catch(() => []));
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Loader full label="Loading..." />;

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setIngredient(idx, patch) {
    setIngredients((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  const addIngredient = () =>
    setIngredients((rows) => [...rows, { itemId: "", defaultQty: "" }]);

  const removeIngredient = (idx) =>
    setIngredients((rows) => rows.filter((_, i) => i !== idx));

  const byId = new Map(stockItems.map((i) => [i.id, i]));

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) return push("Put the dish name.", "error");
    if (!form.price || Number(form.price) <= 0) return push("Put a price above zero.", "error");

    setSaving(true);
    try {
      const payload = {
        name: sanitizeText(form.name, NAME_MAX),
        category: form.category,
        price: Number(form.price),
        spiceLevel: form.spiceLevel,
        description: sanitizeText(form.description, DESCRIPTION_MAX),
        available: Boolean(form.available),
      };

      // The image keys only go up when a new file was uploaded. The server
      // treats a missing key as "leave it alone", so editing no longer wipes
      // the existing photo, the calories or the allergens.
      if (form.image) {
        payload.imagePath = form.image;
        payload.imageName = form.imageName || undefined;
      }
      if (!isEdit) {
        payload.calories = form.calories ?? undefined;
        payload.allergens = form.allergens ?? [];
      }

      let menuItemId = id;

      if (isEdit) {
        await dataStore.update("menu", (m) => String(m.id) === String(id), payload);
      } else {
        // The ingredients hang off the dish, so the dish has to exist first.
        const created = await dataStore.insert("menu", payload);
        const saved = (created || []).find((m) => m.name === payload.name);
        menuItemId = saved?.id;
      }

      const list = ingredients.filter((g) => g.itemId);

      if (menuItemId) {
        await apiPut(`/menu/${menuItemId}/ingredients`, {
          items: list.map((g) => ({
            itemId: g.itemId,
            defaultQty:
              g.defaultQty === "" || g.defaultQty === null ? null : Number(g.defaultQty),
          })),
        });
      } else if (list.length) {
        // Rare, but better to say so than to let the ingredients vanish.
        push("The dish was saved, but its ingredients could not be attached.", "error");
      }

      push(isEdit ? "Dish updated." : "Dish added.", "success");
      navigate("/app/super-admin/menu");
    } catch (err) {
      push(err?.message || "Could not save the dish. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 overflow-x-hidden">
      <button
        type="button"
        onClick={() => navigate("/app/super-admin/menu")}
        className="flex items-center gap-1 text-sm font-semibold text-ink-500 transition hover:text-brand-600"
      >
        <ArrowLeft size={16} /> Back to Menu
      </button>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Dish details */}
        <section className="rounded-2xl border border-ink-100 bg-white">
          <div className="flex items-center gap-3 border-b border-ink-100 p-4 sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <UtensilsCrossed size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-ink-900 sm:text-xl">
                {isEdit ? "Edit Dish" : "Add Dish"}
              </h1>
              <p className="text-xs leading-5 text-ink-500 sm:text-sm">
                What it is called, what it costs, and what it is made from.
              </p>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className="mb-1.5 block text-xs font-semibold text-ink-700">
                  Dish Name <span className="text-brand-600">*</span>
                </label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  maxLength={NAME_MAX}
                  placeholder="e.g. Beef Khichuri"
                  className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-base outline-none transition focus:border-brand-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="category" className="mb-1.5 block text-xs font-semibold text-ink-700">
                  Category
                </label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-brand-500 sm:text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="price" className="mb-1.5 block text-xs font-semibold text-ink-700">
                  Price (Tk) <span className="text-brand-600">*</span>
                </label>
                <input
                  id="price"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  placeholder="90"
                  className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-base outline-none transition focus:border-brand-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="spice" className="mb-1.5 block text-xs font-semibold text-ink-700">
                  Spice Level
                </label>
                <select
                  id="spice"
                  value={form.spiceLevel}
                  onChange={(e) => updateField("spiceLevel", e.target.value)}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-brand-500 sm:text-sm"
                >
                  {SPICE_LEVELS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={form.available}
                    onChange={(e) => updateField("available", e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                  />
                  Available to order
                </label>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="desc" className="mb-1.5 block text-xs font-semibold text-ink-700">
                  Description
                </label>
                <textarea
                  id="desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  maxLength={DESCRIPTION_MAX}
                  placeholder="What is in it, how it is served"
                  className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-base outline-none transition focus:border-brand-500 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <p className="mb-1.5 text-xs font-semibold text-ink-700">Photo</p>

                <FileUpload
                  kind="menu-items"
                  value={form.image || form.previewUrl}
                  fileName={form.imageName}
                  accept="image/*"
                  onChange={(path, name) => {
                    updateField("image", path);
                    updateField("imageName", name);
                    if (!path) updateField("previewUrl", "");
                  }}
                />

                {form.previewUrl && !form.image && (
                  <img
                    src={form.previewUrl}
                    alt="Current photo"
                    className="mt-2 h-28 w-28 rounded-lg border border-ink-200 object-cover"
                  />
                )}

                {form.image && (
                  <p className="mt-2 text-xs font-medium text-emerald-600">
                    New photo ready. Save to apply it.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Ingredients */}
        <section className="rounded-2xl border border-ink-100 bg-white">
          <div className="border-b border-ink-100 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink-700">
              <Soup size={15} /> Ingredients
            </h2>
            <p className="mt-1 text-xs leading-5 text-ink-500">
              What the kitchen needs to cook this dish. Whenever it is planned
              for a day, the shopping list fills itself in from this, so only
              the amounts have to be typed.
            </p>
          </div>

          <div className="space-y-2 p-4 sm:p-5">
            {ingredients.map((g, idx) => {
              const item = byId.get(g.itemId);

              return (
                <div
                  key={idx}
                  className="flex min-w-0 flex-col gap-2 rounded-lg border border-ink-100 bg-ink-50/50 p-3 sm:flex-row sm:items-start"
                >
                  <div className="min-w-0 flex-1">
                    <ItemPicker
                      items={stockItems}
                      value={g.itemId}
                      onChange={(itemId) => setIngredient(idx, { itemId })}
                      onItemCreated={loadStockItems}
                    />
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      inputMode="decimal"
                      value={g.defaultQty ?? ""}
                      onChange={(e) => setIngredient(idx, { defaultQty: e.target.value })}
                      placeholder="Usual qty"
                      className="w-28 rounded-lg border border-ink-200 px-2 py-2 text-sm outline-none transition focus:border-brand-500"
                    />

                    <span className="w-10 shrink-0 text-xs text-ink-400">
                      {item?.unit ?? ""}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeIngredient(idx)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-600"
                      aria-label="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}

            {ingredients.length === 0 && (
              <p className="rounded-lg bg-ink-50 px-3 py-6 text-center text-sm text-ink-400">
                No ingredients yet. Without them the shopping list for this dish
                comes out empty.
              </p>
            )}

            <button
              type="button"
              onClick={addIngredient}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-ink-300 px-3 py-2 text-xs font-semibold text-ink-600 transition hover:border-brand-400 hover:text-brand-600"
            >
              <Plus size={14} /> Add ingredient
            </button>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/app/super-admin/menu")}
            className="w-full justify-center sm:w-auto"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            icon={Save}
            loading={saving}
            className="w-full justify-center sm:w-auto"
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Dish"}
          </Button>
        </div>
      </form>
    </div>
  );
}