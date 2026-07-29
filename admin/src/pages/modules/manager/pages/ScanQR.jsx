import { useEffect, useState } from "react";
import { ScanLine, CheckCircle2, XCircle, User, Wallet, Receipt, Clock } from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import Loader from "../../../../components/shared/Loader";
import { Link } from "react-router-dom";

/**
 * SRS 13.3 — QR Scanner Module. No camera/backend yet (per client instruction),
 * so scanning is simulated by picking a client's mock QR from a dropdown. The
 * validation logic (active / expired / suspended) is fully real against the
 * mock data, so this page behaves exactly like the real scanner will once a
 * camera feed replaces the dropdown.
 */
export default function ScanQR() {
  const [clients, setClients] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [result, setResult] = useState(null); // { ok, message, client }

  useEffect(() => {
    (async () => setClients(await dataStore.load("clients", "clients.json")))();
  }, []);

  if (!clients) return <Loader full label="Loading client directory..." />;

  function simulateScan() {
    const client = clients.find((c) => c.id === selectedId);
    if (!client) {
      setResult({ ok: false, message: "Invalid QR Code" });
      return;
    }
    if (client.status === "suspended") {
      setResult({ ok: false, message: "Account Suspended", client });
      return;
    }
    if (client.qrStatus === "expired") {
      setResult({ ok: false, message: "Expired QR Code", client });
      return;
    }
    if (client.qrStatus !== "active") {
      setResult({ ok: false, message: "Invalid QR Code", client });
      return;
    }
    setResult({ ok: true, message: "QR Verified", client });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">QR Scanner</h1>
        <p className="text-sm text-ink-400">
          Scan a client's QR card to load their profile before placing an order.
        </p>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-ink-700">
              Simulate QR Scan (select a client card)
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">-- Select a QR card --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.employeeId} ({c.qrStatus}
                  {c.status === "suspended" ? ", suspended" : ""})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={simulateScan}
            disabled={!selectedId}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ScanLine size={16} /> Scan
          </button>
        </div>
      </div>

      {result && !result.ok && (
        <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-5 text-brand-700">
          <XCircle size={24} />
          <div>
            <p className="font-semibold">{result.message}</p>
            <p className="text-sm text-brand-600">
              This client cannot be scanned in. Contact Super Admin if this seems wrong.
            </p>
          </div>
        </div>
      )}

      {result && result.ok && (
        <div className="rounded-xl border border-emerald-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2 text-emerald-600">
            <CheckCircle2 size={22} />
            <p className="font-semibold">QR Verified — Active</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow icon={User} label="Client Name" value={result.client.name} />
            <InfoRow icon={User} label="Employee ID" value={result.client.employeeId} />
            <InfoRow icon={User} label="Department" value={result.client.department} />
            <InfoRow icon={User} label="Designation" value={result.client.designation} />
            <InfoRow
              icon={Wallet}
              label="Wallet Balance"
              value={`\u09F3${result.client.walletBalance}`}
            />
            <InfoRow
              icon={Receipt}
              label="Current Monthly Bill"
              value={`\u09F3${result.client.monthlyBill}`}
            />
            <InfoRow icon={Clock} label="Last Order Date" value="2026-07-27" />
            <InfoRow icon={CheckCircle2} label="Account Status" value={result.client.status} />
          </div>
          <Link
            to="/app/manager/new-order"
            state={{ client: result.client }}
            className="mt-6 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Create Order for {result.client.name.split(" ")[0]}
          </Link>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-ink-50 p-3">
      <Icon size={16} className="mt-0.5 text-ink-400" />
      <div>
        <p className="text-xs text-ink-400">{label}</p>
        <p className="text-sm font-semibold capitalize text-ink-800">{value}</p>
      </div>
    </div>
  );
}
