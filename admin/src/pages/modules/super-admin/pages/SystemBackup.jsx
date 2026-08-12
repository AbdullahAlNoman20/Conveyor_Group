// FILE: src/pages/modules/super-admin/pages/SystemBackup.jsx (NEW)
import { useState } from "react";
import {
  HardDriveDownload, Save, RotateCcw, Trash2, FileSpreadsheet, FileText, Database, TrendingUp, TrendingDown, DollarSign,
} from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { useLiveCollection } from "../../../../components/hooks/useLiveCollection";
import { genId } from "../../../../components/utils/idGenerator";
import { downloadJSON } from "../../../../components/utils/downloadFile";
import { exportMultiSheetExcel } from "../../../../components/utils/exportExcel";
import { printOnLetterhead } from "../../../../components/utils/printLetterhead";
import { useToast } from "../../../../components/hooks/useToast";
import Button from "../../../../components/shared/Button";
import StatCard from "../../../../components/shared/StatCard";
import ConfirmDialog from "../../../../components/shared/ConfirmDialog";
import Loader from "../../../../components/shared/Loader";
import DateRangeFilter, { useDateRangeFilter } from "../../../../components/shared/DateRangeFilter";

// Every collection this system persists — kept as a single source of truth
// so Full Backup, Monthly Snapshot, and Restore never drift out of sync
// with each other or with what other pages actually read/write.
const BACKUP_COLLECTIONS = [
  { key: "clients", file: "clients.json", label: "Clients" },
  { key: "users", file: "users.json", label: "Users" },
  { key: "managers", file: "managers.json", label: "Managers" },
  { key: "kitchenStaff", file: "kitchen-staff.json", label: "KitchenStaff" },
  { key: "menu", file: "menu.json", label: "Menu" },
  { key: "weeklyMenu", file: "weekly-menu.json", label: "WeeklyMenu" },
  { key: "tables", file: "tables.json", label: "Tables" },
  { key: "orders", file: "orders.json", label: "Orders" },
  { key: "purchaseVouchers", file: "purchase-vouchers.json", label: "PurchaseVouchers" },
  { key: "walletTransactions", file: "wallet-transactions.json", label: "WalletTransactions" },
  { key: "guests", file: "guests.json", label: "Guests" },
  { key: "guestRequests", file: "guest-requests.json", label: "GuestRequests" },
  { key: "preBookings", file: "pre-bookings.json", label: "PreBookings" },
  { key: "profileRequests", file: "profile-requests.json", label: "ProfileRequests" },
  { key: "notifications", file: "notifications.json", label: "Notifications" },
  { key: "auditLogs", file: "audit-logs.json", label: "AuditLogs" },
  { key: "customVoucherCategories", file: "custom-voucher-categories.json", label: "VoucherCategories" },
  { key: "settings", file: "settings.json", label: "Settings" },
];

function monthLabel(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function inRange(dateStr, from, to) {
  const d = new Date(dateStr);
  return d >= from && d <= to;
}

async function loadAllCollections() {
  const entries = await Promise.all(
    BACKUP_COLLECTIONS.map(async ({ key, file }) => [key, await dataStore.load(key, file)])
  );
  return Object.fromEntries(entries);
}

export default function SystemBackup() {
  const { push } = useToast();
  const snapshots = useLiveCollection("monthlySnapshots", "monthly-snapshots.json");
  const orders = useLiveCollection("orders", "orders.json");
  const vouchers = useLiveCollection("purchaseVouchers", "purchase-vouchers.json");
  const tx = useLiveCollection("walletTransactions", "wallet-transactions.json");

  const [busy, setBusy] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { type: 'overwrite'|'restore'|'delete', snapshot }
  const [confirmBusy, setConfirmBusy] = useState(false);
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range } =
    useDateRangeFilter("This Month");

  if (!snapshots || !orders || !vouchers || !tx) return <Loader full label="Loading system backup..." />;

  // --- Full system backup -------------------------------------------------
  async function downloadFullBackupJSON() {
    setBusy(true);
    try {
      const collections = await loadAllCollections();
      downloadJSON(
        { generatedAt: new Date().toISOString(), collections },
        `cccms-full-backup-${new Date().toISOString().slice(0, 10)}`
      );
      push("Full backup (JSON) downloaded.", "success");
    } finally {
      setBusy(false);
    }
  }

  async function downloadFullBackupExcel() {
    setBusy(true);
    try {
      const collections = await loadAllCollections();
      const sheets = Object.fromEntries(
        BACKUP_COLLECTIONS.map(({ key, label }) => [label, collections[key]])
      );
      exportMultiSheetExcel(sheets, `cccms-full-backup-${new Date().toISOString().slice(0, 10)}`);
      push("Full backup (Excel) downloaded.", "success");
    } finally {
      setBusy(false);
    }
  }

  // --- Monthly snapshot -----------------------------------------------------
  async function performSaveSnapshot() {
    setBusy(true);
    try {
      const data = await loadAllCollections();
      const month = monthLabel();
      const existing = snapshots.find((s) => s.month === month);
      if (existing) {
        await dataStore.update("monthlySnapshots", (s) => s.id === existing.id, {
          data,
          createdAt: new Date().toISOString(),
        });
      } else {
        await dataStore.insert("monthlySnapshots", {
          id: genId("SNAP"),
          month,
          createdAt: new Date().toISOString(),
          data,
        });
      }
      push(`Snapshot for ${month} saved.`, "success");
    } finally {
      setBusy(false);
    }
  }

  function requestSaveSnapshot() {
    const month = monthLabel();
    const existing = snapshots.find((s) => s.month === month);
    if (existing) {
      setConfirmTarget({ type: "overwrite", snapshot: existing });
    } else {
      performSaveSnapshot();
    }
  }

  function downloadSnapshotExcel(snapshot) {
    const sheets = Object.fromEntries(
      BACKUP_COLLECTIONS.map(({ key, label }) => [label, snapshot.data?.[key]])
    );
    exportMultiSheetExcel(sheets, `cccms-snapshot-${snapshot.month}`);
  }

  function downloadSnapshotPDF(snapshot) {
    const rows = BACKUP_COLLECTIONS.map(({ key, label }) => {
      const val = snapshot.data?.[key];
      const count = Array.isArray(val) ? val.length : val ? 1 : 0;
      return `<tr><td>${label}</td><td style="text-align:right;">${count}</td></tr>`;
    }).join("");
    const bodyHtml = `
      <h2 style="margin:0 0 4px;font-size:16px;">Monthly Backup Snapshot — ${snapshot.month}</h2>
      <p style="margin:0 0 16px;font-size:12px;color:#595959;">
        Saved on ${new Date(snapshot.createdAt).toLocaleString()}. Record counts by collection —
        full data is available in the Excel/JSON export.
      </p>
      <table>
        <thead><tr><th>Collection</th><th style="text-align:right;">Records</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    printOnLetterhead({ title: `Snapshot ${snapshot.month}`, bodyHtml });
  }

  async function performRestore(snapshot) {
    setConfirmBusy(true);
    try {
      for (const { key } of BACKUP_COLLECTIONS) {
        if (snapshot.data && Object.prototype.hasOwnProperty.call(snapshot.data, key)) {
          await dataStore.save(key, snapshot.data[key]);
        }
      }
      push(`Restored system data from ${snapshot.month} snapshot.`, "success");
    } finally {
      setConfirmBusy(false);
      setConfirmTarget(null);
    }
  }

  async function performDelete(snapshot) {
    setConfirmBusy(true);
    try {
      await dataStore.remove("monthlySnapshots", (s) => s.id === snapshot.id);
      push("Snapshot deleted.", "success");
    } finally {
      setConfirmBusy(false);
      setConfirmTarget(null);
    }
  }

  async function handleConfirm() {
    if (!confirmTarget) return;
    if (confirmTarget.type === "overwrite") {
      setConfirmBusy(true);
      await performSaveSnapshot();
      setConfirmBusy(false);
      setConfirmTarget(null);
    } else if (confirmTarget.type === "restore") {
      await performRestore(confirmTarget.snapshot);
    } else if (confirmTarget.type === "delete") {
      await performDelete(confirmTarget.snapshot);
    }
  }

  // --- Financial report -----------------------------------------------------
  const ordersInRange = orders.filter((o) => inRange(o.createdAt, range.from, range.to));
  const vouchersInRange = vouchers.filter((v) => inRange(v.date, range.from, range.to));
  const txInRange = tx.filter((t) => inRange(t.date, range.from, range.to));

  const salesIncome = ordersInRange.reduce((s, o) => s + (o.amount || 0), 0);
  const walletRecharge = txInRange.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalIncome = salesIncome + walletRecharge;
  const totalExpense = vouchersInRange.reduce((s, v) => s + v.amount, 0);
  const profit = totalIncome - totalExpense;
  const byCategory = vouchersInRange.reduce((acc, v) => {
    acc[v.category] = (acc[v.category] || 0) + v.amount;
    return acc;
  }, {});

  function downloadFinancialExcel() {
    exportMultiSheetExcel(
      {
        Summary: [
          { metric: "Sales Income", amount: salesIncome },
          { metric: "Wallet Recharge", amount: walletRecharge },
          { metric: "Total Income", amount: totalIncome },
          { metric: "Total Expense", amount: totalExpense },
          { metric: "Profit", amount: profit },
        ],
        Orders: ordersInRange,
        PurchaseVouchers: vouchersInRange,
        WalletTransactions: txInRange,
      },
      `financial-report-${range.from.toISOString().slice(0, 10)}_to_${range.to.toISOString().slice(0, 10)}`
    );
  }

  function downloadFinancialPDF() {
    const catRows = Object.entries(byCategory)
      .map(([cat, amt]) => `<tr><td>${cat}</td><td style="text-align:right;">Tk ${amt.toLocaleString()}</td></tr>`)
      .join("");
    const bodyHtml = `
      <h2 style="margin:0 0 4px;font-size:16px;">Financial Report</h2>
      <p style="margin:0 0 16px;font-size:12px;color:#595959;">
        ${range.from.toLocaleDateString()} — ${range.to.toLocaleDateString()}
      </p>
      <div class="row"><span class="label">Sales Income</span><span>Tk ${salesIncome.toLocaleString()}</span></div>
      <div class="row"><span class="label">Wallet Recharge</span><span>Tk ${walletRecharge.toLocaleString()}</span></div>
      <div class="row total"><span>Total Income</span><span>Tk ${totalIncome.toLocaleString()}</span></div>
      <div class="row total"><span>Total Expense</span><span>Tk ${totalExpense.toLocaleString()}</span></div>
      <div class="row total"><span>Profit</span><span>Tk ${profit.toLocaleString()}</span></div>
      <h2 style="margin:24px 0 4px;font-size:14px;">Expense by Category</h2>
      <table><thead><tr><th>Category</th><th style="text-align:right;">Amount</th></tr></thead>
      <tbody>${catRows || `<tr><td colspan="2">No expenses in range.</td></tr>`}</tbody></table>
    `;
    printOnLetterhead({ title: "Financial Report", bodyHtml });
  }

  const sortedSnapshots = [...snapshots].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">System Backup</h1>
        <p className="text-sm text-ink-400">
          Full system backup, monthly data snapshots, and financial report exports.
        </p>
      </div>

      <section className="rounded-xl border border-ink-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-bold text-ink-700">Full System Backup</h2>
        <p className="mb-4 text-xs text-ink-400">
          Clients, managers, kitchen staff, menu, tables, QR status, wallet, and all other data.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={HardDriveDownload} onClick={downloadFullBackupJSON} loading={busy}>
            Download JSON Backup
          </Button>
          <Button variant="secondary" icon={FileSpreadsheet} onClick={downloadFullBackupExcel} loading={busy}>
            Download Excel Backup
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-ink-100 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-ink-700">Monthly Snapshots</h2>
            <p className="text-xs text-ink-400">Save the current month's data as a point-in-time restore point.</p>
          </div>
          <Button variant="primary" icon={Save} onClick={requestSaveSnapshot} loading={busy}>
            Save {monthLabel()} Snapshot
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-ink-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase text-ink-400">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Saved At</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {sortedSnapshots.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-ink-800">{s.month}</td>
                  <td className="px-4 py-3 text-ink-500">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="icon" title="Download Excel" onClick={() => downloadSnapshotExcel(s)}>
                        <FileSpreadsheet size={14} />
                      </Button>
                      <Button variant="icon" title="Download PDF" onClick={() => downloadSnapshotPDF(s)}>
                        <FileText size={14} />
                      </Button>
                      <Button
                        variant="icon"
                        title="Restore this snapshot"
                        onClick={() => setConfirmTarget({ type: "restore", snapshot: s })}
                      >
                        <RotateCcw size={14} />
                      </Button>
                      <Button
                        variant="icon"
                        title="Delete"
                        className="hover:text-brand-600 hover:bg-brand-50"
                        onClick={() => setConfirmTarget({ type: "delete", snapshot: s })}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedSnapshots.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-ink-400">
                    No snapshots saved yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-ink-100 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-ink-700">Financial Report</h2>
            <p className="text-xs text-ink-400">Download income/expense details for a selected period.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={FileSpreadsheet} onClick={downloadFinancialExcel}>
              Excel
            </Button>
            <Button variant="secondary" icon={FileText} onClick={downloadFinancialPDF}>
              PDF
            </Button>
          </div>
        </div>

        <DateRangeFilter
          preset={preset}
          setPreset={setPreset}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          range={range}
        />

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Income" value={`Tk ${totalIncome.toLocaleString()}`} Icon={TrendingUp} accent="emerald" />
          <StatCard label="Total Expense" value={`Tk ${totalExpense.toLocaleString()}`} Icon={TrendingDown} accent="brand" />
          <StatCard label="Profit" value={`Tk ${profit.toLocaleString()}`} Icon={DollarSign} accent={profit >= 0 ? "emerald" : "brand"} />
          <StatCard label="Records" value={ordersInRange.length + vouchersInRange.length} Icon={Database} accent="ink" />
        </div>
      </section>

      <ConfirmDialog
        open={!!confirmTarget}
        title={
          confirmTarget?.type === "overwrite"
            ? `Overwrite ${monthLabel()} snapshot?`
            : confirmTarget?.type === "restore"
            ? `Restore data from ${confirmTarget?.snapshot?.month}?`
            : "Delete this snapshot?"
        }
        message={
          confirmTarget?.type === "overwrite"
            ? "A snapshot for this month already exists. Saving again will overwrite it with the current data."
            : confirmTarget?.type === "restore"
            ? "This will replace ALL current system data with this snapshot's data. This cannot be undone."
            : "This permanently removes the saved snapshot. This cannot be undone."
        }
        confirmLabel="Confirm"
        danger={confirmTarget?.type === "restore" || confirmTarget?.type === "delete"}
        busy={confirmBusy}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}