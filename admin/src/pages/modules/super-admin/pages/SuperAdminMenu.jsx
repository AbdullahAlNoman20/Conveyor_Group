import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";
import Loader from "../../../../components/shared/Loader";
import SearchInput from "../../../../components/shared/SearchInput";
import { DishImage } from "../../../../components/shared/DishImage";

export default function SuperAdminMenu() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [menu, setMenu] = useState(null);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toggleBusyId, setToggleBusyId] = useState(null);

  useEffect(() => {
    (async () => setMenu(await dataStore.load("menu", "menu.json")))();
  }, []);

  const filtered = (menu || []).filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));
  const { page, setPage, totalPages, pageItems: pagedMenu } = usePagination(filtered, 9);

  if (!menu) return <Loader full label="Loading menu..." />;

  async function toggleAvailable(item) {
    setToggleBusyId(item.id);
    const next = await dataStore.update("menu", (m) => m.id === item.id, { available: !item.available });
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
          <p className="text-sm text-ink-400">Add, edit, activate, or remove menu items.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Search dish name..." />
          <Button variant="primary" icon={Plus} onClick={() => navigate("/app/super-admin/menu/new")}>
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
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => toggleAvailable(m)}
                  disabled={toggleBusyId === m.id}
                  className={`flex items-center gap-1 text-xs font-semibold transition-colors disabled:opacity-50 ${m.available ? "text-emerald-600" : "text-ink-400"}`}
                >
                  {m.available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {m.available ? "Active" : "Inactive"}
                </button>
                <div className="flex gap-1">
                  <Button variant="icon" onClick={() => navigate(`/app/super-admin/menu/${m.id}`)}>
                    <Edit2 size={14} />
                  </Button>
                  <Button variant="icon" className="hover:text-brand-600 hover:bg-brand-50" onClick={() => setDeleteTarget(m.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="col-span-full py-10 text-center text-sm text-ink-400">No menu items found.</p>}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {deleteTarget && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-white p-4 shadow-2xl sm:left-72">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-ink-700">Delete this menu item? It disappears from ordering everywhere immediately.</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>Cancel</Button>
              <Button variant="danger" onClick={confirmDelete} loading={deleteBusy}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}