// backend/src/services/qr.service.ts
import { clientRepo } from "../repositories/client.repo.js";
import { orderRepo } from "../repositories/order.repo.js";
import { getSettings } from "./settings.service.js";
import { AppError } from "../lib/errors.js";
import { signedUrl } from "../storage/supabase.js";

export interface ScanResult {
  ok: boolean;
  message: string;
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
 * Manager scan. The card QR is PERMANENT and carries the client's qrToken.
 * Verification order mirrors ScanQR.evaluateClient exactly, so the messages
 * the Manager sees are unchanged.
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

  const client = clientId
    ? await clientRepo.byId(clientId)
    : presentedToken
      ? await clientRepo.byQrToken(presentedToken)
      : null;

  if (!client) return { ok: false, message: "Invalid QR Code" };
  if (client.status === "suspended") return { ok: false, message: "Account Suspended" };
  if (client.status === "archived") return { ok: false, message: "Invalid QR Code" };
  if (client.qrStatus === "expired") return { ok: false, message: "Expired QR Code" };
  // Reissued card: the old printed card dies here.
  if (presentedToken && presentedToken !== client.qrToken) {
    return { ok: false, message: "Invalid QR Code — this card has been replaced" };
  }
  if (!presentedToken) return { ok: false, message: "Invalid QR Code" };

  return {
    ok: true,
    message: "QR Verified",
    client: {
      id: client.id,
      name: client.name,
      employeeId: client.employeeId,
      department: client.department,
      designation: client.designation,
      mealPlan: client.mealPlan,
      mealBenefit: client.mealBenefit,
      status: client.status,
      qrStatus: client.qrStatus,
      photo: await signedUrl(client.photoPath),
      lastOrderDate: await orderRepo.lastOrderDate(client.id), // was hardcoded in the UI
    },
  };
}