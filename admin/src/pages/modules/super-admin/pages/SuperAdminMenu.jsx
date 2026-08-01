import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { genId } from "../../../../components/utils/idGenerator";
import { sanitizeText, sanitizeNumber } from "../../../../components/utils/sanitize";
import { useToast } from "../../../../components/hooks/useToast";
import FormField from "../../../../components/shared/FormField";
import Modal from "../../../../components/shared/Modal";
import ConfirmDialog from "../../../../components/shared/ConfirmDialog";
import Loader from "../../../../components/shared/Loader";

const EMPTY = { name: "", category: "Fixed Meal", price: "" };

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

  if (!menu) return <Loader full label="Loading menu..." />;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }
  function openEdit(item) {
    setEditing(item);
    setForm({ name: item.name, category: item.category, price: item.price });
    setModalOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    const price = sanitizeNumber(form.price, { min: 0, max: 100000 });
    if (!form.name.trim() || price === null) {
      push("Name and a valid price are required.", "error");
      return;
    }
    if (editing) {
      const next = await dataStore.update("menu", (m) => m.id === editing.id, {
        name: sanitizeText(form.name, 100),
        category: form.category,
        price,
      });
      setMenu(next);
      push("Menu item updated.", "success");
    } else {
      const record = {
        id: genId("M"),
        name: sanitizeText(form.name, 100),
        category: form.category,
        price,
        available: true,
      };
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
          <p className="text-sm text-ink-400">Add, edit, activate, or remove menu items.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Add Menu Item
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {menu.map((m) => (
          <div key={m.id} className="rounded-xl border border-ink-100 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-ink-900">{m.name}</p>
                <p className="text-xs text-ink-400">{m.category}</p>
              </div>
              <span className="font-bold text-brand-600">Tk {m.price}</span>
            </div>
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
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Menu Item" : "Add Menu Item"} size="sm">
        <form onSubmit={save} className="space-y-4">
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
              <option>Fixed Meal</option>
              <option>Custom Menu</option>
              <option>Beverage</option>
            </select>
          </FormField>
          <FormField label="Unit Price (Tk )" required>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </FormField>
          <button className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            {editing ? "Save Changes" : "Add Item"}
          </button>
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
