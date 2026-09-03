import { HardDriveDownload, FileJson, FileSpreadsheet } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { downloadJSON } from "../../../../components/utils/downloadFile";
import { exportToCSV } from "../../../../components/utils/exportCSV";

function inRange(dateStr, from, to) {
  const d = new Date(dateStr);
  return d >= from && d <= to;
}

function rangeBounds(kind) {
  const now = new Date();
  if (kind === "daily") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from, to: now, label: now.toISOString().slice(0, 10) };
  }
  if (kind === "weekly") {
    const from = new Date(now);
    from.setDate(now.getDate() - 7);
    return { from, to: now, label: `week-${now.toISOString().slice(0, 10)}` };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from, to: now, label: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` };
}

export default function SystemBackup() {
  async function backup(kind, format) {
    const { from, to, label } = rangeBounds(kind);
    const orders = await dataStore.load("orders", "orders.json");
    const clients = await dataStore.load("clients", "clients.json");
    const notifications = await dataStore.load("notifications", "notifications.json");
    const accountRequests = await dataStore.load("accountRequests", "account-requests.json");

    const ordersInRange = orders.filter((o) => inRange(o.createdAt, from, to));
    const notificationsInRange = notifications.filter((n) => inRange(n.createdAt, from, to));

    if (format === "json") {
      downloadJSON(
        { generatedAt: new Date().toISOString(), range: { from: from.toISOString(), to: to.toISOString() }, orders: ordersInRange, clients, notifications: notificationsInRange, accountRequests },
        `cccms-${kind}-backup-${label}`
      );
    } else {
      exportToCSV(
        ordersInRange.map((o) => ({
          Date: new Date(o.createdAt).toLocaleString(),
          Order: o.id,
          Employee: o.clientName,
          Items: (o.items || []).map((i) => `${i.qty}x ${i.name}`).join("; "),
          "Amount (Tk)": o.amount,
          "Paid Via": o.paymentMethod,
          Status: o.status,
        })),
        `cccms-${kind}-transactions-${label}`
      );
    }
  }

  const ranges = [
    ["daily", "Daily (Today)"],
    ["weekly", "Weekly (Last 7 Days)"],
    ["monthly", "Monthly (This Month)"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">System Backup</h1>
        <p className="text-sm text-ink-400">Download all orders, transactions, and activity — JSON or CSV.</p>
      </div>

      <div className="space-y-4">
        {ranges.map(([kind, label]) => (
          <div key={kind} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-5">
            <div className="flex items-center gap-3">
              <HardDriveDownload size={20} className="text-brand-600" />
              <p className="font-semibold text-ink-800">{label}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => backup(kind, "json")}
                className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
              >
                <FileJson size={14} /> JSON
              </button>
              <button
                onClick={() => backup(kind, "csv")}
                className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
              >
                <FileSpreadsheet size={14} /> CSV
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}