import { useEffect, useRef, useState } from "react";
import {
  ScanLine, CheckCircle2, XCircle, User, Wallet, Receipt, Clock, Monitor, Keyboard,
} from "lucide-react";
import { Link } from "react-router-dom";
import { dataStore } from "../../../../components/services/dataStore";
import { isMobileDevice, hasCameraSupport } from "../../../../components/utils/device";
import QRScannerCamera from "../../../../components/shared/QRScannerCamera";
import Loader from "../../../../components/shared/Loader";

/**
 * SRS §13.3 — QR Scanner Module.
 *  - Handset (phone/tablet with a camera): the camera opens automatically
 *    and scans live.
 *  - Desktop/laptop: no camera auto-open (per client request) — instead we
 *    show a message directing staff to a connected scanner or their phone,
 *    and accept input from a physical USB/Bluetooth barcode scanner (which
 *    behaves like a keyboard typing the code followed by Enter) via the
 *    text field below. A manual "simulate" dropdown stays available too,
 *    for testing without any hardware.
 */
export default function ScanQR() {
  const [clients, setClients] = useState(null);
  const [guests, setGuests] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [result, setResult] = useState(null); // { ok, message, client, guest }
  const [scannerInput, setScannerInput] = useState("");
  const inputRef = useRef(null);
  const mobile = isMobileDevice() && hasCameraSupport();

  useEffect(() => {
    (async () => {
      setClients(await dataStore.load("clients", "clients.json"));
      setGuests(await dataStore.load("guests", "guests.json"));
    })();
  }, []);

  useEffect(() => {
    if (!mobile) inputRef.current?.focus();
  }, [mobile]);

  if (!clients || !guests) return <Loader full label="Loading directory..." />;

  function evaluateClient(client) {
    if (!client) return { ok: false, message: "Invalid QR Code" };
    if (client.status === "suspended") return { ok: false, message: "Account Suspended", client };
    if (client.qrStatus === "expired") return { ok: false, message: "Expired QR Code", client };
    if (client.qrStatus !== "active") return { ok: false, message: "Invalid QR Code", client };
    return { ok: true, message: "QR Verified", client };
  }

  function evaluateGuest(guest) {
    if (!guest) return { ok: false, message: "Invalid QR Code" };
    if (guest.status !== "active") return { ok: false, message: "Expired QR Code", guest };
    return { ok: true, message: "Guest QR Verified", guest };
  }

  /** Decodes whatever a camera or hardware scanner just read and matches it
   *  against clients (JSON payload from ClientQRCard) or guests (plain
   *  qrToken string from GuestManagement). */
  function handleDecoded(text) {
    try {
      const payload = JSON.parse(text);
      if (payload?.clientId) {
        const client = clients.find((c) => c.id === payload.clientId);
        setResult(evaluateClient(client));
        return;
      }
    } catch {
      // Not JSON — fall through to guest-token matching below.
    }
    const guest = guests.find((g) => g.qrToken === text.trim());
    setResult(guest ? evaluateGuest(guest) : { ok: false, message: "Invalid QR Code" });
  }

  function simulateScan() {
    const client = clients.find((c) => c.id === selectedId);
    setResult(evaluateClient(client));
  }

  function onScannerInputKeyDown(e) {
    if (e.key === "Enter" && scannerInput.trim()) {
      handleDecoded(scannerInput.trim());
      setScannerInput("");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">QR Scanner</h1>
        <p className="text-sm text-ink-400">
          Scan a client or guest QR to load their profile before placing an order.
        </p>
      </div>

      {mobile ? (
        <QRScannerCamera onScan={handleDecoded} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <Monitor size={20} className="mt-0.5 shrink-0" />
            <p>
              For scanning, please use a scanner or your handset. This screen doesn't have a
              camera, but a connected USB/Bluetooth barcode scanner will work below — it types
              the code automatically, just like a keyboard.
            </p>
          </div>

          <div className="rounded-xl border border-ink-100 bg-white p-6">
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-ink-700">
              <Keyboard size={15} /> Scanner Input
            </label>
            <input
              ref={inputRef}
              value={scannerInput}
              onChange={(e) => setScannerInput(e.target.value)}
              onKeyDown={onScannerInputKeyDown}
              placeholder="Click here, then scan with a connected device..."
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="rounded-xl border border-dashed border-ink-200 bg-white p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
              No hardware handy? Simulate a scan for testing
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="flex-1 rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">-- Select a client QR card --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.employeeId} ({c.qrStatus}
                    {c.status === "suspended" ? ", suspended" : ""})
                  </option>
                ))}
              </select>
              <button
                onClick={simulateScan}
                disabled={!selectedId}
                className="flex items-center justify-center gap-2 rounded-lg bg-ink-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ScanLine size={16} /> Simulate
              </button>
            </div>
          </div>
        </div>
      )}

      {result && !result.ok && (
        <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-5 text-brand-700">
          <XCircle size={24} />
          <div>
            <p className="font-semibold">{result.message}</p>
            <p className="text-sm text-brand-600">
              This card cannot be scanned in. Contact Super Admin if this seems wrong.
            </p>
          </div>
        </div>
      )}

      {result?.ok && result.client && (
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
            <InfoRow icon={Wallet} label="Wallet Balance" value={`Tk ${result.client.walletBalance}`} />
            <InfoRow icon={Receipt} label="Current Monthly Bill" value={`Tk ${result.client.monthlyBill}`} />
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

      {result?.ok && result.guest && (
        <div className="rounded-xl border border-emerald-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2 text-emerald-600">
            <CheckCircle2 size={22} />
            <p className="font-semibold">Guest QR Verified</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow icon={User} label="Guest Name" value={result.guest.name} />
            <InfoRow icon={User} label="Guest Type" value={result.guest.type} />
            <InfoRow icon={CheckCircle2} label="Status" value={result.guest.status} />
          </div>
          <Link
            to="/app/manager/new-order"
            state={{ guest: { name: result.guest.name, department: result.guest.company || result.guest.organization || "" } }}
            className="mt-6 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Create Order for {result.guest.name.split(" ")[0]}
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
