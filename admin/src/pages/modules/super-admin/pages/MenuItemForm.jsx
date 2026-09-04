// REPLACE WITH (entire file: src/pages/modules/super-admin/pages/MenuItemForm.jsx)
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";
import Loader from "../../../../components/shared/Loader";
import FormField from "../../../../components/shared/FormField";
import FileUpload from "../../../../components/shared/FileUpload";
import { sanitizeText } from "../../../../components/utils/sanitize";

const CATEGORIES = [
  "Appetizer",
  "Main Course",
  "Dessert",
  "Beverage",
  "Side Dish",
];
const SPICE_LEVELS = ["None", "Mild", "Medium", "Hot", "Extra Hot"];

const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;
const PRICE_MAX = 1000000;

const EMPTY_FORM = {
  name: "",
  category: CATEGORIES[0],
  price: "",
  spiceLevel: SPICE_LEVELS[0],
  description: "",
  image: "",
  imageName: "",
  available: true,
};

const FIELD_INFO = {
  name: {
    instruction: "The dish name shown to customers on the menu.",
    example: "Chicken Curry with Rice",
  },
  category: {
    instruction:
      "Groups the dish under a menu section so customers can browse by type.",
    example: "Main Course",
  },
  spiceLevel: {
    instruction:
      "How spicy the dish is — helps customers choose what suits them.",
    example: "Medium",
  },
  price: {
    instruction:
      "Price charged per order, in Taka (Tk). Must be greater than 0.",
    example: "150",
  },
  image: {
    instruction:
      "Upload a photo of the dish. Stored locally for now and will move to the database later — a default image is shown if none is provided.",
    example: "JPG or PNG, under 2MB",
  },
  description: {
    instruction:
      "A short description of the dish shown to customers (ingredients, taste, etc.).",
    example: "Tender chicken cooked in a rich curry, served with steamed rice.",
  },
};

function validate(form) {
  const errors = {};
  const name = form.name.trim();
  if (!name) errors.name = "Name is required.";
  else if (name.length > NAME_MAX)
    errors.name = `Name must be ${NAME_MAX} characters or fewer.`;

  const priceNum = Number(form.price);
  if (form.price === "" || Number.isNaN(priceNum))
    errors.price = "Price must be a valid number.";
  else if (priceNum <= 0) errors.price = "Price must be greater than 0.";
  else if (priceNum > PRICE_MAX) errors.price = "Price is too large.";

  if (!CATEGORIES.includes(form.category))
    errors.category = "Invalid category.";
  if (!SPICE_LEVELS.includes(form.spiceLevel))
    errors.spiceLevel = "Invalid spice level.";

  if (form.description && form.description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }

  return errors;
}

export default function MenuItemForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { push } = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const menu = await dataStore.load("menu", "menu.json");
      if (!active) return;
      if (isEdit) {
        const existing = (menu || []).find((m) => String(m.id) === String(id));
        if (!existing) {
          setNotFound(true);
        } else {
          setForm({
            name: existing.name ?? "",
            category: CATEGORIES.includes(existing.category)
              ? existing.category
              : CATEGORIES[0],
            price: existing.price != null ? String(existing.price) : "",
            spiceLevel: SPICE_LEVELS.includes(existing.spiceLevel)
              ? existing.spiceLevel
              : SPICE_LEVELS[0],
            description: existing.description ?? "",
            image: existing.image ?? "",
            imageName: existing.imageName ?? "",
            available: existing.available ?? true,
          });
        }
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const payload = {
        name: sanitizeText(form.name, NAME_MAX),
        category: form.category,
        price: Number(form.price),
        spiceLevel: form.spiceLevel,
        description: sanitizeText(form.description, DESCRIPTION_MAX),
        image: form.image,
        imageName: form.imageName,
        available: Boolean(form.available),
      };

      if (isEdit) {
        await dataStore.update(
          "menu",
          (m) => String(m.id) === String(id),
          payload,
        );
        push("Menu item updated.", "success");
      } else {
        await dataStore.create("menu", payload);
        push("Menu item created.", "success");
      }
      navigate("/app/super-admin/menu");
    } catch (err) {
      push("Failed to save menu item. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loader full label="Loading menu item..." />;

  if (notFound) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-500">Menu item not found.</p>
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => navigate("/app/super-admin/menu")}
        >
          Back to Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-3 sm:space-y-6 sm:px-0">
      <div className="flex items-center gap-3">
        <Button
          variant="icon"
          onClick={() => navigate("/app/super-admin/menu")}
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
            {isEdit ? "Edit Menu Item" : "Add Menu Item"}
          </h1>
          <p className="text-xs text-ink-400 sm:text-sm">
            {isEdit
              ? "Update the details for this dish."
              : "Create a new dish for the menu."}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 rounded-xl border border-ink-100 bg-white p-4 sm:p-6"
      >
        <FormField
          label="Dish Name"
          htmlFor="name"
          error={errors.name}
          required
          info={FIELD_INFO.name}
        >
          <input
            id="name"
            type="text"
            maxLength={NAME_MAX}
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className={`w-full min-w-0 rounded-lg border px-3 py-2.5 text-sm outline-none  focus:ring-brand-500 ${errors.name ? "border-red-400" : "border-ink-200"}`}
            aria-invalid={Boolean(errors.name)}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Category"
            htmlFor="category"
            info={FIELD_INFO.category}
          >
            <select
              id="category"
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="w-full min-w-0 rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none  focus:ring-brand-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Spice Level"
            htmlFor="spiceLevel"
            info={FIELD_INFO.spiceLevel}
          >
            <select
              id="spiceLevel"
              value={form.spiceLevel}
              onChange={(e) => updateField("spiceLevel", e.target.value)}
              className="w-full min-w-0 rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none  focus:ring-brand-500"
            >
              {SPICE_LEVELS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField
          label="Price (Tk)"
          htmlFor="price"
          error={errors.price}
          required
          info={FIELD_INFO.price}
        >
          <input
            id="price"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={form.price}
            onChange={(e) => updateField("price", e.target.value)}
            className={`w-full min-w-0 rounded-lg border px-3 py-2.5 text-sm outline-none  focus:ring-brand-500 ${errors.price ? "border-red-400" : "border-ink-200"}`}
            aria-invalid={Boolean(errors.price)}
          />
        </FormField>

        <FormField
          label="Dish Photo"
          info={FIELD_INFO.image}
          hint="JPG or PNG, under 2MB."
        >
          <FileUpload
            value={form.image}
            fileName={form.imageName}
            accept="image/*"
            onChange={(dataUrl, name) => {
              updateField("image", dataUrl);
              updateField("imageName", name);
            }}
          />
          {form.image && (
            <img
              src={form.image}
              alt="Dish preview"
              className="mt-2 h-28 w-28 rounded-lg border border-ink-200 object-cover"
            />
          )}
        </FormField>

        <FormField
          label="Description"
          htmlFor="description"
          error={errors.description}
          info={FIELD_INFO.description}
        >
          <textarea
            id="description"
            rows={3}
            maxLength={DESCRIPTION_MAX}
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className={`w-full min-w-0 resize-none rounded-lg border px-3 py-2.5 text-sm outline-none  focus:ring-brand-500 ${errors.description ? "border-red-400" : "border-ink-200"}`}
            aria-invalid={Boolean(errors.description)}
          />
        </FormField>

        <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <input
            type="checkbox"
            checked={form.available}
            onChange={(e) => updateField("available", e.target.checked)}
            className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          />
          Available for ordering
        </label>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            fullWidth={false}
            onClick={() => navigate("/app/super-admin/menu")}
            disabled={submitting}
            className="sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={Save}
            loading={submitting}
            className="sm:w-auto"
          >
            {isEdit ? "Save Changes" : "Create Item"}
          </Button>
        </div>
      </form>
    </div>
  );
}
