// FILE: src/pages/modules/manager/pages/ScanQR.jsx  (MODIFIED, full rewrite)
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ScanLine, CheckCircle2, XCircle, User, Wallet, Receipt, Clock, Monitor, Keyboard, Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { dataStore } from "../../../../components/services/dataStore";
import { isMobileDevice, hasCameraSupport } from "../../../../components/utils/device";
import { createInstantFixedMealOrder } from "../../../../components/services/selfOrder";
import { useToast } from "../../../../components/hooks/useToast";
import QRScannerCamera from "../../../../components/shared/QRScannerCamera";
import OrderTokenModal from "../../../../components/shared/OrderTokenModal";
import Loader from "../../../../components/shared/Loader";

/**
 * SRS §13.3 — QR Scanner Module.
 *  - Handset (phone/tablet with a camera): the camera opens automatically
 *    and scans live.
 *  - Desktop/laptop: no camera auto-open (per client request) — instead we
 *    show a message directing staff to a connected scanner or their phone,
 *    and accept input from a physical USB/Bluetooth barcode scanner (which
 *    behaves like a keyboard typing the code followed by Enter) via the
 *    text field below. A searchable "simulate" picker stays available too,
 *    for testing without any hardware.
 */
export default function ScanQR() {
  const { push } = useToast();
  const [clients, setClients] = useState(null);
  const [guests, setGuests] = useState(null);
  const [menu, setMenu] = useState(null);
  const [weeklyMenu, setWeeklyMenu] = useState(null);
  const [orders, setOrders] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [simSearch, setSimSearch] = useState("");
  const [result, setResult] = useState(null); // { ok, message, client, guest }
  const [scannerInput, setScannerInput] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false); // click-to-open, never auto-starts
  const [cameraFailed, setCameraFailed] = useState(false); // camera errored — fall back to search UI even on mobile
  const [placingInstant, setPlacingInstant] = useState(false);
  const [instantOrder, setInstantOrder] = useState(null);
  const inputRef = useRef(null);
  const mobile = isMobileDevice() && hasCameraSupport();
  const showFallbackSearch = !mobile || cameraFailed;

  useEffect(() => {
    (async () => {
      setClients(await dataStore.load("clients", "clients.json"));
      setGuests(await dataStore.load("guests", "guests.json"));
      setMenu(await dataStore.load("menu", "menu.json"));
      setWeeklyMenu(await dataStore.load("weeklyMenu", "weekly-menu.json"));
      setOrders(await dataStore.load("orders", "orders.json"));
    })();
  }, []);

  useEffect(() => {
    if (showFallbackSearch) inputRef.current?.focus();
  }, [showFallbackSearch]);

  // ALL hooks (including useMemo below) must run on every render, before
  // any early return — calling useMemo only after a conditional `return`
  // changes the hook count between the "loading" and "loaded" renders and
  // throws "Rendered more hooks than during the previous render."
  const simResults = useMemo(() => {
    const list = clients || [];
    const q = simSearch.trim().toLowerCase();
    if (!q) return list.slice(0, 8);
    return list
      .filter((c) => c.name.toLowerCase().includes(q) || c.employeeId.toLowerCase().includes(q))
      .slice(0, 8);
  }, [clients, simSearch]);

  if (!clients || !guests || !menu || !weeklyMenu || !orders) return <Loader full label="Loading directory..." />;

  // Fixed-meal clients scanned by the Manager skip menu selection AND both
  // approval steps entirely — this creates the order right here and sends
  // it straight to the Token Board, same shared logic as the client's own
  // Self-Order Station scan.
  async function placeInstantOrder(client) {
    setPlacingInstant(true);
    try {
      const order = await createInstantFixedMealOrder({
        client,
        clients,
        orders,
        weeklyMenu,
        menu,
        source: "manager_scan",
      });
      push(`Order ${order.id} confirmed — sent straight to the kitchen board.`, "success");
      setInstantOrder(order);
      setResult(null);
    } catch (err) {
      push(err?.message || "Couldn't place the order. Please try again.", "error");
    } finally {
      setPlacingInstant(false);
    }
  }

  function closeInstantModal() {
    setInstantOrder(null);
  }

  function evaluateClient(client, scannedToken) {
    if (!client) return { ok: false, message: "Invalid QR Code" };
    if (client.status === "suspended") return { ok: false, message: "Account Suspended", client };
    if (client.qrStatus === "expired") return { ok: false, message: "Expired QR Code", client };
    if (client.qrStatus !== "active") return { ok: false, message: "Invalid QR Code", client };
    if (scannedToken && client.qrToken && scannedToken !== client.qrToken) {
      return { ok: false, message: "Invalid QR Code — this card has been replaced", client };
    }
    return { ok: true, message: "QR Verified", client };
  }

  function evaluateGuest(guest) {
    if (!guest) return { ok: false, message: "Invalid QR Code" };
    if (guest.status !== "active") return { ok: false, message: "Expired QR Code", guest };
    return { ok: true, message: "Guest QR Verified", guest };
  }

  function handleDecoded(text) {
    try {
      const payload = JSON.parse(text);
      if (payload?.clientId) {
        const client = clients.find((c) => c.id === payload.clientId);
        setResult(evaluateClient(client, payload.qrToken));
        return;
      }
    } catch {
      // Not JSON — fall through to guest-token matching below.
    }
    const guest = guests.find((g) => g.qrToken === text.trim());
    setResult(guest ? evaluateGuest(guest) : { ok: false, message: "Invalid QR Code" });
  }

  function simulateScan(client) {
    setSelectedId(client.id);
    setResult(evaluateClient(client));
  }

  function onScannerInputKeyDown(e) {
    if (e.key === "Enter" && scannerInput.trim()) {
      handleDecoded(scannerInput.trim());
      setScannerInput("");
    }
  }

  // Camera is mounted only after an explicit tap — QRScannerCamera starts
  // the device camera the moment it mounts, so gating the mount behind this
  // handler is what makes "open camera on click" actually true instead of
  // auto-opening as soon as the page loads.
  function openCameraAndArm() {
    setResult(null);
    setCameraOpen(true);
  }

  function handleDecodedOnce(text) {
    setCameraOpen(false); // one shot per tap, per SRS — re-tap "Scan" to scan again
    handleDecoded(text);
  }

  function handleCameraError() {
    // Camera couldn't start (permissions, non-HTTPS, unsupported device,
    // or the library itself failing) — never leave the manager stuck.
    // Fall back to the same manual/simulate search used on desktop so an
    // order can still be placed using the client/guest data already on
    // this device (public/data JSON), with zero backend dependency.
    setCameraOpen(false);
    setCameraFailed(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">QR Scanner</h1>
        <p className="text-sm text-ink-400">
          Scan a client or guest QR to load their profile before placing an order.
        </p>
      </div>

      {mobile && !cameraFailed ? (
        cameraOpen ? (
          <QRScannerCamera onScan={handleDecodedOnce} onError={handleCameraError} />
        ) : (
          <button
            type="button"
            onClick={openCameraAndArm}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 bg-white py-10 text-ink-500 hover:border-brand-400 hover:text-brand-600"
          >
            <ScanLine size={28} />
            <span className="text-sm font-semibold">Tap to Open Camera & Scan</span>
          </button>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <Monitor size={20} className="mt-0.5 shrink-0" />
            <p>
              {cameraFailed
                ? "Camera scanning isn't available right now on this device. Search and select a client or guest below instead — everything still works."
                : "For scanning, please use a scanner or your handset. This screen doesn't have a camera, but a connected USB/Bluetooth barcode scanner will work below — it types the code automatically, just like a keyboard."}
            </p>
          </div>

          {!mobile && (
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
          )}

          <div className="rounded-xl border border-dashed border-ink-200 bg-white p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
              No hardware handy? Simulate a scan for testing
            </p>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={simSearch}
                onChange={(e) => setSimSearch(e.target.value)}
                placeholder="Search a client by name or Employee ID..."
                className="w-full rounded-lg border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
              {simResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => simulateScan(c)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-50 ${
                    selectedId === c.id ? "bg-brand-50 ring-1 ring-brand-200" : ""
                  }`}
                >
                  <span className="font-medium text-ink-800">{c.name}</span>
                  <span className="flex items-center gap-2 text-xs text-ink-400">
                    {c.employeeId}
                    <span className={c.status === "suspended" || c.qrStatus !== "active" ? "text-brand-600" : "text-emerald-600"}>
                      {c.status === "suspended" ? "suspended" : c.qrStatus}
                    </span>
                    <ScanLine size={14} className="text-ink-300" />
                  </span>
                </button>
              ))}
              {simResults.length === 0 && (
                <p className="px-3 py-4 text-sm text-ink-400">No matching clients.</p>
              )}
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
          {result.client.mealPlan === "Fixed Company Meal" ? (
            <button
              type="button"
              disabled={placingInstant}
              onClick={() => placeInstantOrder(result.client)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {placingInstant
                ? "Placing order..."
                : `Confirm Fixed Meal for ${result.client.name.split(" ")[0]} — Instant Order`}
            </button>
          ) : (
            <Link
              to="/app/manager/new-order"
              state={{ client: result.client }}
              className="mt-6 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {`Create Order for ${result.client.name.split(" ")[0]}`}
            </Link>
          )}
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

      <OrderTokenModal open={!!instantOrder} order={instantOrder} onClose={closeInstantModal} />
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