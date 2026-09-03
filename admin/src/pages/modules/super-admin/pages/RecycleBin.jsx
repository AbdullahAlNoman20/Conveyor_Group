import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { useToast } from "../../../../components/hooks/useToast";
import AvatarImage from "../../../../components/shared/AvatarImage";
import Loader from "../../../../components/shared/Loader";

export default function RecycleBin() {
  const navigate = useNavigate();
  const { push } = useToast();
  const clients = useLiveCollection("clients", "clients.json");
  const [busyId, setBusyId] = useState(null);

  if (!clients) return <Loader full label="Loading recycle bin..." />;
  const archived = clients.filter((c) => c.status === "archived");

  async function restore(client) {
    setBusyId(client.id);
    await dataStore.update("clients", (c) => c.id === client.id, { status: client.prevStatus || "active" });
    if (client.userId) await dataStore.update("users", (u) => u.id === client.userId, { status: "active" });
    push(`${client.name} restored.`, "success");
    setBusyId(null);
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/app/super-admin/clients")} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Back to Clients
      </button>

      <div>
        <h1 className="text-2xl font-bold text-ink-900">Recycle Bin</h1>
        <p className="text-sm text-ink-400">Deleted clients land here — restore anytime, nothing is permanently erased.</p>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <div className="space-y-2">
          {archived.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg bg-ink-50 px-3 py-2.5 text-sm">
              <AvatarImage name={c.name} size={32} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-800">{c.name}</p>
                <p className="truncate text-xs text-ink-400">{c.employeeId} · {c.department}</p>
              </div>
              <button
                onClick={() => restore(c)}
                disabled={busyId === c.id}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <RotateCcw size={13} /> Restore
              </button>
            </div>
          ))}
          {archived.length === 0 && <p className="py-8 text-center text-sm text-ink-400">Recycle Bin is empty.</p>}
        </div>
      </div>
    </div>
  );
}