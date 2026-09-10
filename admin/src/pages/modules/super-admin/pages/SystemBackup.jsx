// admin/src/pages/modules/super-admin/pages/SystemBackup.jsx
import { useState } from "react";
import { HardDriveDownload, FileJson, FileSpreadsheet } from "lucide-react";
import { api } from "../../../../components/services/api";
import { useToast } from "../../../../components/hooks/useToast";

const RANGES = [
  ["daily", "Daily (Today)"],
  ["weekly", "Weekly (Last 7 Days)"],
  ["monthly", "Monthly (This Month)"],
];

export default function SystemBackup() {
  const { push } = useToast();
  const [busy, setBusy] = useState(null);

  // The export is built by a single server query set and streamed back as a
  // file. The old version assembled it in the browser from collections that
  // no longer exist (wallet transactions), so it silently produced empty JSON.
  async function backup(kind, format) {
    setBusy(`${kind}-${format}`);
    try {
      const res = await api.get(`/backup?kind=${kind}&format=${format}`, {
        responseType: "blob",
      });

      const disposition = res.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || `cccms-${kind}-backup.${format}`;

      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      push("Backup downloaded.", "success");
    } catch (err) {
      push(err?.message || "Backup failed. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">System Backup</h1>
        <p className="text-sm text-ink-400">
          Download all orders and activity for a period — JSON or CSV.
        </p>
      </div>

      <div className="space-y-4">
        {RANGES.map(([kind, label]) => (
          <div
            key={kind}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <HardDriveDownload size={20} className="shrink-0 text-brand-600" />
              <p className="font-semibold text-ink-800">{label}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => backup(kind, "json")}
                disabled={busy !== null}
                className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50"
              >
                <FileJson size={14} />
                {busy === `${kind}-json` ? "..." : "JSON"}
              </button>
              <button
                onClick={() => backup(kind, "csv")}
                disabled={busy !== null}
                className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50"
              >
                <FileSpreadsheet size={14} />
                {busy === `${kind}-csv` ? "..." : "CSV"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}