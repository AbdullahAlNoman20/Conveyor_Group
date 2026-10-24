// admin/src/pages/modules/super-admin/pages/SuperAdminMenu.jsx  (full replace)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useToast } from "../../../../components/hooks/useToast";
import { useRoleBase } from "../../../../components/hooks/useRoleBase";
import Button from "../../../../components/shared/Button";
import Pagination, { usePagination } from "../../../../components/shared/Pagination";
import Loader from "../../../../components/shared/Loader";
import SearchInput from "../../../../components/shared/SearchInput";
import { DishImage } from "../../../../components/shared/DishImage";

export default function SuperAdminMenu() {
  const navigate = useNavigate();
  const { push } = useToast();
  // Same screen for Super Admin, Manager and Accounts, so links follow the role.
  const base = useRoleBase();

  const [menu, setMenu] = useState(null);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toggleBusyId, setToggleBusyId] = useState(null);

  useEffect(() => {
    let mounted = true;
    dataStore
      .load("menu", "menu.json")
      .then((rows) => mounted && setMenu(rows || []))
      .catch(() => mounted && setMenu([]));
    return () => {
      mounted = false;
    };
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = (menu || []).filter((m) => (m.name || "").toLowerCase().includes(q));
  const { page, setPage, totalPages, pageItems: pagedMenu } = usePagination(filtered, 9);

  if (!menu) return <Loader full label="Loading menu..." />;

  async function toggleAvailable(item) {
    setToggleBusyId(item.id);
    try {
      const next = await dataStore.update("menu", (m) => m.id === item.id, {
        available: !item.available,
      });
      setMenu(next);
    } catch (err) {
      push(err?.message || "Could not change this dish.", "error");
    } finally {
      setToggleBusyId(null);
    }
  }

  async function confirmDelete() {
    setDeleteBusy(true);
    try {
      const next = await dataStore.remove("menu", (m) => m.id === deleteTarget);
      setMenu(next);
      push("Dish deleted.", "success");
      setDeleteTarget(null);
    } catch (err) {
      push(err?.message || "Could not delete this dish.", "error");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Menu Management</h1>
          <p className="text-sm text-ink-400">Add, edit, turn on or off, or remove dishes.</p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
          <div className="w-full sm:w-64">
            <SearchInput value={query} onChange={setQuery} placeholder="Search dish name..." />
          </div>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => navigate(`${base}/menu/new`)}
            className="w-full justify-center sm:w-auto"
          >
            Add Dish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {pagedMenu.map((m) => (
          <div key={m.id} className="min-w-0 overflow-hidden rounded-xl border border-ink-100 bg-white">
            <DishImage src={m.image} name={m.name} className="h-32 w-full" />
            <div className="p-4">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">{m.name}</p>
                  <p className="truncate text-xs text-ink-400">
                    {m.category}
                    {m.spiceLevel && m.spiceLevel !== "-" ? `, ${m.spiceLevel}` : ""}
                  </p>
                </div>
                <span className="shrink-0 font-bold text-brand-600">Tk {m.price}</span>
              </div>

              {m.description && (
                <p className="mt-2 line-clamp-2 text-xs text-ink-500">{m.description}</p>
              )}

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleAvailable(m)}
                  disabled={toggleBusyId === m.id}
                  className={`flex min-h-9 items-center gap-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    m.available ? "text-emerald-600" : "text-ink-400"
                  }`}
                >
                  {m.available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {m.available ? "On" : "Off"}
                </button>

                <div className="flex gap-1">
                  <Button variant="icon" title="Edit" onClick={() => navigate(`${base}/menu/${m.id}`)}>
                    <Edit2 size={14} />
                  </Button>
                  <Button
                    variant="icon"
                    title="Delete"
                    className="hover:bg-brand-50 hover:text-brand-600"
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
          <p className="col-span-full py-10 text-center text-sm text-ink-400">No dishes found.</p>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {deleteTarget && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-white p-3 shadow-2xl sm:p-4 lg:left-72">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-center text-sm font-medium text-ink-700 sm:text-left">
              Delete this dish? It will be gone from ordering right away.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDelete} loading={deleteBusy}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}