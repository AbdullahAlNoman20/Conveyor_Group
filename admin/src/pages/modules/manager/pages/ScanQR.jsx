// admin/src/pages/modules/manager/pages/ScanQR.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  User,
  Clock,
  Wallet,
  Ban,
  AlertTriangle,
  CalendarCheck,
  Monitor,
  Keyboard,
  Search,
} from "lucide-react";
import { dataStore } from "../../../../components/services/dataStore";
import { apiGet, apiPost } from "../../../../components/services/api";
import {
  isMobileDevice,
  hasCameraSupport,
} from "../../../../components/utils/device";
import { createInstantFixedMealOrder } from "../../../../components/services/selfOrder";
import { useToast } from "../../../../components/hooks/useToast";
import QRScannerCamera from "../../../../components/shared/QRScannerCamera";
import OrderTokenModal from "../../../../components/shared/OrderTokenModal";
import Loader from "../../../../components/shared/Loader";
import { mealStatusLabel } from "../../../../components/shared/mealStatus";
import { buzzOnBlocked } from "../../../../components/utils/haptics";

/**
 * SRS §13.3 — QR Scanner Module.
 *
 * Handset with a camera: tap to open the camera and scan live.
 * Desktop: no camera, so a USB/Bluetooth scanner types into the input below.
 * Either way, "Find by Name" serves anyone whose card can't be read at all —
 * lost, damaged, or the camera refusing to start.
 */
export default function ScanQR() {
  const { push } = useToast();

  // Guests removed: guests.json never existed, so that whole branch was dead
  // and the Custom-Menu path linked to a route that doesn't exist.
  const [clients, setClients] = useState(null);
  const [window_, setWindow] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [simSearch, setSimSearch] = useState("");
  const [result, setResult] = useState(null);
  const [scannerInput, setScannerInput] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false); // click-to-open, never auto-starts
  const [cameraFailed, setCameraFailed] = useState(false);
  const [placingInstant, setPlacingInstant] = useState(false);
  const [instantOrder, setInstantOrder] = useState(null);

  const inputRef = useRef(null);
  const mobile = isMobileDevice() && hasCameraSupport();
  const showFallbackSearch = !mobile || cameraFailed;

  useEffect(() => {
    (async () => {
      setClients(await dataStore.load("clients"));
      // The counter's opening hours come from the server so a wrong device
      // clock can't make the button look available when it isn't.
      const register = await apiGet("/attendance/daily").catch(() => null);
      if (register) {
        setWindow({ open: register.orderWindowOpen, label: register.orderWindowLabel });
      }
    })();
  }, []);

  useEffect(() => {
    if (showFallbackSearch) inputRef.current?.focus();
  }, [showFallbackSearch]);

  // Every hook must run on every render, before any early return — calling
  // useMemo only after a conditional `return` changes the hook count between
  // the loading and loaded renders and throws.
  const simResults = useMemo(() => {
    const list = clients || [];
    const q = simSearch.trim().toLowerCase();
    if (!q) return list.slice(0, 8);
    return list
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.employeeId.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [clients, simSearch]);

  if (!clients) return <Loader full label="Loading directory..." />;

  const windowClosed = window_?.open === false;
  const canServe = Boolean(result?.client?.canOrderToday) && !windowClosed;

  // The employee's own status wins over the clock: "they cancelled" is a more
  // useful answer than "the counter is shut".
  const serveBlockedReason =
    {
      cancelled: "Employee cancelled today's meal — cannot order",
      collected: "Meal already collected today",
      no_show: "Employee missed today's meal window",
    }[result?.client?.attendanceStatus] ||
    (windowClosed
      ? `Counter closed — ordering is ${window_?.label} only`
      : "Ordering unavailable today");

  /**
   * Fixed-meal clients served by the Manager skip menu selection and every
   * approval step — this creates the order and sends it straight to the token
   * board, through the same path as a Self-Order Station scan.
   */
  async function placeInstantOrder(client) {
    setPlacingInstant(true);
    try {
      const order = await createInstantFixedMealOrder({
        source: "manager_scan",
        clientId: client.id,
      });
      push(`Order ${order.id} confirmed — sent straight to the kitchen board.`, "success");
      setInstantOrder(order);
      setResult(null);
    } catch (err) {
      // The server refused what the screen thought was servable, so the same
      // signal applies.
      buzzOnBlocked();
      push(err?.message || "Couldn't place the order. Please try again.", "error");
    } finally {
      setPlacingInstant(false);
    }
  }

  /**
   * Shows the result and buzzes when the person cannot be served.
   *
   * The counter being shut is just as much a refusal as a cancelled meal, so
   * the clock is folded in here rather than left to the button's disabled
   * state, which nobody feels.
   */
  function showResult(next) {
    setResult(next);

    const servable = next?.ok && next.client?.canOrderToday && !windowClosed;
    if (!servable) buzzOnBlocked();
  }

  // Every check (suspended / expired / replaced card) runs server-side.
  // Front-end validation alone was trivially bypassable.
  async function handleDecoded(text) {
    try {
      showResult(await apiPost("/qr/scan", { payload: text }));
    } catch (err) {
      showResult({ ok: false, message: err.message, via: "scan" });
    }
  }

  /**
   * Serve someone whose card can't be scanned.
   *
   * This used to fake a scan payload, but the staff client list deliberately
   * withholds the card's secret token — so the forged payload always failed
   * the token check and every manual lookup came back "Invalid QR Code". The
   * server has a dedicated endpoint for this, which skips the card check and
   * records that a person made the identification.
   */
  async function lookupByName(client) {
    setSelectedId(client.id);
    try {
      showResult(await apiPost(`/qr/lookup/${client.id}`));
    } catch (err) {
      showResult({ ok: false, message: err.message, via: "manual" });
    }
  }

  function onScannerInputKeyDown(e) {
    if (e.key === "Enter" && scannerInput.trim()) {
      handleDecoded(scannerInput.trim());
      setScannerInput("");
    }
  }

  // The camera is mounted only after an explicit tap — QRScannerCamera starts
  // the device camera the moment it mounts, so gating the mount behind this
  // handler is what makes "open on click" true rather than on page load.
  function openCameraAndArm() {
    setResult(null);
    setCameraOpen(true);
  }

  function handleDecodedOnce(text) {
    setCameraOpen(false); // one shot per tap — re-tap to scan again
    handleDecoded(text);
  }

  function handleCameraError() {
    // Permissions, a non-HTTPS origin, or an unsupported device. Never leave
    // the Manager stuck: fall through to name lookup, which still serves.
    setCameraOpen(false);
    setCameraFailed(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">QR Scanner</h1>
        <p className="text-sm text-ink-400">
          Scan an employee's card to serve their meal — or find them by name if
          the card can't be read.
        </p>
      </div>

      {mobile && !cameraFailed ? (
        cameraOpen ? (
          <QRScannerCamera onScan={handleDecodedOnce} onError={handleCameraError} />
        ) : (
          <button
            type="button"
            onClick={openCameraAndArm}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 bg-white py-10 text-ink-500 transition hover:border-brand-400 hover:text-brand-600"
          >
            <ScanLine size={28} />
            <span className="text-sm font-semibold">Tap to Open Camera & Scan</span>
          </button>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            <Monitor size={20} className="mt-0.5 shrink-0" />
            <p>
              {cameraFailed
                ? "Camera scanning isn't available on this device right now. Find the employee by name below — the meal is served exactly the same way."
                : "This screen has no camera. A connected USB or Bluetooth scanner works in the box below — it types the code just like a keyboard. Or find the employee by name."}
            </p>
          </div>

          {!mobile && (
            <div className="rounded-xl border border-ink-100 bg-white p-6">
              <label
                htmlFor="scannerInput"
                className="mb-1 flex items-center gap-2 text-sm font-medium text-ink-700"
              >
                <Keyboard size={15} /> Scanner Input
              </label>
              <input
                id="scannerInput"
                ref={inputRef}
                value={scannerInput}
                onChange={(e) => setScannerInput(e.target.value)}
                onKeyDown={onScannerInputKeyDown}
                placeholder="Click here, then scan with a connected device..."
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          )}

          <div className="rounded-xl border border-ink-100 bg-white p-6">
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-700">
              <Search size={15} /> Find by Name
            </p>
            <p className="mb-3 text-xs leading-5 text-ink-400">
              Use this when a card is lost, damaged, or the camera won't read
              it. The meal is recorded the same way, noted as identified by
              name.
            </p>

            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                value={simSearch}
                onChange={(e) => setSimSearch(e.target.value)}
                placeholder="Search by name or Employee ID..."
                className="w-full rounded-lg border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
              {simResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => lookupByName(c)}
                  className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-ink-50 ${
                    selectedId === c.id ? "bg-brand-50 ring-1 ring-brand-200" : ""
                  }`}
                >
                  <span className="min-w-0 truncate font-medium text-ink-800">{c.name}</span>

                  <span className="flex shrink-0 items-center gap-2 text-xs text-ink-400">
                    {c.employeeId}
                    <span
                      className={
                        c.status === "suspended" || c.qrStatus !== "active"
                          ? "text-brand-600"
                          : "text-emerald-600"
                      }
                    >
                      {c.status === "suspended" ? "suspended" : c.qrStatus}
                    </span>
                    <User size={14} className="text-ink-300" />
                  </span>
                </button>
              ))}

              {simResults.length === 0 && (
                <p className="px-3 py-4 text-sm text-ink-400">No matching employees.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {result && !result.ok && (
        <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-5 text-brand-700">
          <XCircle size={24} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">{result.message}</p>
            <p className="mt-0.5 text-sm leading-5 text-brand-600">
              {/* A failed name lookup means something is wrong with the account,
                  not with a card — saying "card" there would be misleading. */}
              {result.via === "manual"
                ? "This employee can't be served right now. Contact the Super Admin if this seems wrong."
                : "This card cannot be scanned in. Try finding the employee by name, or contact the Super Admin."}
            </p>
          </div>
        </div>
      )}

      {windowClosed && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          <Clock size={18} className="mt-0.5 shrink-0" />
          <p>
            The counter is closed. Meal ordering is open{" "}
            <span className="font-semibold">{window_?.label}</span> only — you
            can still look someone up to check their details.
          </p>
        </div>
      )}

      {result?.ok && result.client && (
        <div className="rounded-xl border border-emerald-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-emerald-600">
            <CheckCircle2 size={22} className="shrink-0" />
            <p className="font-semibold">{result.message}</p>

            {/* Say plainly how this person was identified — it changes what the
                meal record means when it's audited later. */}
            {result.via === "manual" && (
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold uppercase text-sky-700">
                Found by name
              </span>
            )}
          </div>

          {result.client.qrExpired && (
            <p className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              This employee's QR card has expired. Serve them now, then ask the
              Super Admin to reissue the card.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow icon={User} label="Employee Name" value={result.client.name} />
            <InfoRow icon={User} label="Employee ID" value={result.client.employeeId} />
            <InfoRow icon={User} label="Department" value={result.client.department} />
            <InfoRow icon={User} label="Designation" value={result.client.designation} />
            <InfoRow
              icon={Wallet}
              label="Outstanding Due"
              value={`Tk ${result.client.monthlyBill ?? 0}`}
            />
            <InfoRow
              icon={CalendarCheck}
              label="Today's Meal"
              value={mealStatusLabel(result.client.attendanceStatus, {
                windowOpen: window_?.open !== false,
                windowLabel: window_?.label,
              })}
            />
            <InfoRow
              icon={Clock}
              label="Last Order Date"
              value={result.client.lastOrderDate || "No orders yet"}
            />
            <InfoRow
              icon={CheckCircle2}
              label="Account Status"
              value={result.client.status}
            />
          </div>

          {/* The button carries the reason itself — a separate warning banner
              would just repeat it a few pixels away. */}
          <button
            type="button"
            disabled={placingInstant || !canServe}
            onClick={() => placeInstantOrder(result.client)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
          >
            {placingInstant ? (
              "Placing order..."
            ) : !canServe ? (
              <>
                <Ban size={16} className="shrink-0" />
                {serveBlockedReason}
              </>
            ) : (
              `Confirm Fixed Meal for ${result.client.name.split(" ")[0]} — Instant Order`
            )}
          </button>
        </div>
      )}

      <OrderTokenModal
        open={!!instantOrder}
        order={instantOrder}
        onClose={() => setInstantOrder(null)}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-lg bg-ink-50 p-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-ink-400" />
      <div className="min-w-0">
        <p className="text-xs text-ink-400">{label}</p>
        <p className="break-words text-sm font-semibold capitalize text-ink-800">{value}</p>
      </div>
    </div>
  );
}