// server/src/services/qr.service.ts
import { clientRepo } from "../repositories/client.repo.js";
import { orderRepo } from "../repositories/order.repo.js";
import { getForClient } from "./attendance.service.js";
import { businessDate, orderWindowOpen } from "../lib/clock.js";
import { getSettings } from "./settings.service.js";
import { AppError } from "../lib/errors.js";
import { signedUrl } from "../storage/index.js";

export interface ScanResult {
  ok: boolean;
  message: string;
  /** How the employee was identified — surfaced in the UI and the audit log. */
  via?: "scan" | "manual";
  client?: Record<string, unknown>;
}

// The station code is a fixed string printed/displayed at the counter.
export async function verifyStationCode(code: string | undefined): Promise<void> {
  const settings = await getSettings();
  if (!code || code.trim() !== settings.selfOrderStationCode) {
    throw new AppError("STATION_CODE_MISMATCH", 400);
  }
}

/**
 * Manager scan. The card QR is PERMANENT and carries the client's qrToken, so
 * a reissued card invalidates the printed one without touching the client row.
 */
export async function scan(payload: string): Promise<ScanResult> {
  let clientId: string | undefined;
  let presentedToken: string | undefined;

  try {
    const parsed = JSON.parse(payload) as { clientId?: string; qrToken?: string };
    clientId = parsed.clientId;
    presentedToken = parsed.qrToken;
  } catch {
    // Not JSON — treat the whole payload as a raw qrToken (hardware scanners).
    presentedToken = payload.trim();
  }

  // A scan must carry a token: without one there is no evidence a card was
  // ever presented, and the manual path below exists for exactly that case.
  if (!presentedToken) return { ok: false, message: "Invalid QR Code", via: "scan" };

  const client = clientId
    ? await clientRepo.byId(clientId)
    : await clientRepo.byQrToken(presentedToken);

  return evaluate(client, presentedToken, "scan");
}

/**
 * Looks an employee up by name instead of by card.
 *
 * Needed whenever the card is lost, damaged, or the camera won't cooperate —
 * the meal still has to be served. Deliberately a separate entry point rather
 * than a fake scan: there is no card to verify, so the token check is skipped
 * and the audit trail records that a human made the identification.
 */
export async function manualLookup(clientId: string): Promise<ScanResult> {
  const client = await clientRepo.byId(clientId);
  return evaluate(client, undefined, "manual");
}

async function evaluate(
  client: Awaited<ReturnType<typeof clientRepo.byId>>,
  presentedToken: string | undefined,
  via: "scan" | "manual",
): Promise<ScanResult> {
  if (!client) {
    return {
      ok: false,
      via,
      message: via === "manual" ? "Employee not found" : "Invalid QR Code",
    };
  }

  if (client.status === "suspended") return { ok: false, message: "Account Suspended", via };
  if (client.status === "archived") {
    return {
      ok: false,
      via,
      message: via === "manual" ? "Employee not found" : "Invalid QR Code",
    };
  }

  // An expired card blocks a scan, but not a manual lookup — the whole point
  // of looking someone up by name is that their card isn't usable.
  if (via === "scan" && client.qrStatus === "expired") {
    return { ok: false, message: "Expired QR Code", via };
  }

  // Reissued card: the old printed card dies here.
  if (presentedToken && presentedToken !== client.qrToken) {
    return { ok: false, message: "Invalid QR Code — this card has been replaced", via };
  }

  // Surfaced so the Manager sees the day's state before pressing Confirm,
  // rather than discovering it from a rejected order.
  const today = await getForClient(client.id, businessDate());
  const attendanceStatus = today?.status ?? "pending";

  // Phrased the same way everywhere, and honest about the clock: outside the
  // counter hours "not collected yet" would be misleading.
  const attendanceLabel = {
    collected: "Collected",
    cancelled: "Cancelled",
    no_show: "Missed",
    pending: orderWindowOpen() ? "Not collected yet" : "Window closed",
  }[attendanceStatus];

  return {
    ok: true,
    message: via === "manual" ? "Employee Verified" : "QR Verified",
    via,
    client: {
      id: client.id,
      name: client.name,
      employeeId: client.employeeId,
      department: client.department,
      designation: client.designation,
      mealPlan: client.mealPlan,
      mealBenefit: client.mealBenefit,
      monthlyBill: Number(client.monthlyBill),
      status: client.status,
      qrStatus: client.qrStatus,
      photo: await signedUrl(client.photoPath),
      lastOrderDate: await orderRepo.lastOrderDate(client.id), // was hardcoded in the UI
      attendanceStatus,
      // A cancelled meal was never cooked and a collected one is already gone,
      // so neither can be ordered again today by anyone.
      canOrderToday: attendanceStatus === "pending",
      // Worth flagging on a manual lookup: the employee should be sent to the
      // Super Admin for a replacement card afterwards.
      qrExpired: client.qrStatus === "expired",
    },
  };
}