import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText, sanitizeNumber } from "../../../../components/utils/sanitize";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";
import FormField from "../../../../components/shared/FormField";
import Loader from "../../../../components/shared/Loader";
import { DishImage } from "../../../../components/shared/DishImage";

const CATEGORIES = ["Fixed Meal", "Custom Menu", "Beverage", "Evening Snack"];
const SPICE_LEVELS = ["Mild", "Medium", "Medium-Hot", "Hot"];
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

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

export default function MenuItemForm() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { push } = useToast();
  const [menu, setMenu] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => setMenu(await dataStore.load("menu", "menu.json")))();
  }, []);

  useEffect(() => {
    if (!menu || isNew) return;
    const item = menu.find((m) => m.id === id);
    if (item) {
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
    }
  }, [menu, id, isNew]);

  if (!menu) return <Loader full label="Loading menu item..." />;

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
      image: form.image || "",
      description: sanitizeText(form.description, 400),
      calories: sanitizeNumber(form.calories, { min: 0, max: 5000 }) ?? undefined,
      spiceLevel: form.spiceLevel,
      allergens: form.allergens.split(",").map((a) => a.trim()).filter(Boolean),
    };
    if (!isNew) {
      await dataStore.update("menu", (m) => m.id === id, payload);
      push("Menu item updated.", "success");
    } else {
      await dataStore.insert("menu", { id: genId("M"), available: true, ...payload });
      push("Menu item added.", "success");
    }
    setSaving(false);
    navigate("/app/super-admin/menu");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => navigate("/app/super-admin/menu")} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Back to Menu
      </button>

      <h1 className="text-2xl font-bold text-ink-900">{isNew ? "Add Menu Item" : "Edit Menu Item"}</h1>

      <form onSubmit={save} className="grid gap-4 rounded-xl border border-ink-100 bg-white p-6 sm:grid-cols-2">
        <FormField label="Food Name" required>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </FormField>
        <FormField label="Category" required>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label="Unit Price (Tk)" required>
          <input type="number" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </FormField>
        <FormField label="Calories (kcal)">
          <input type="number" min="0" value={form.calories} onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </FormField>
        <FormField label="Spice Level">
          <select value={form.spiceLevel} onChange={(e) => setForm((f) => ({ ...f, spiceLevel: e.target.value }))} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100">
            {SPICE_LEVELS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="Allergens" hint="Comma-separated, e.g. Egg, Fish">
          <input value={form.allergens} onChange={(e) => setForm((f) => ({ ...f, allergens: e.target.value }))} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
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
              {form.image && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, image: "" }))} className="w-fit text-[11px] font-semibold text-brand-600 hover:underline">
                  Remove uploaded photo
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="sm:col-span-2">
          <FormField label="Description">
            <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
          </FormField>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" fullWidth onClick={() => navigate("/app/super-admin/menu")}>Cancel</Button>
          <Button type="submit" variant="primary" fullWidth loading={saving}>{isNew ? "Add Item" : "Save Changes"}</Button>
        </div>
      </form>
    </div>
  );
}