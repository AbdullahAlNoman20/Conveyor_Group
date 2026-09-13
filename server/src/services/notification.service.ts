// backend/src/services/notification.service.ts
import { notificationRepo } from "../repositories/notification.repo.js";
import { genId } from "../lib/ids.js";
import { sanitizeText } from "../lib/sanitize.js";
import { emitToRole, emitToUsers } from "../sockets/index.js";

// Mirrors the frontend's SOCKET_EVENTS, plus ORDER_SUBMITTED which PlaceOrder.jsx
// referenced but was never defined (every manual order wrote event: undefined).
export const SOCKET_EVENTS = {
  ACCOUNT_REQUEST_SUBMITTED: "account_request:submitted",
  INSTANT_ORDER_CREATED: "order:instant_created",
  FOOD_READY: "order:ready",
  ORDER_SUBMITTED: "order:submitted",
  ORDER_STATUS_CHANGED: "order:status_changed",
  MEAL_CANCELLED: "meal:cancelled",
  NO_SHOW_SWEEP: "meal:no_show_sweep",
  NO_SHOW_CHARGED: "meal:no_show_charged",
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

function resolveLink(event: string, role: string): string | null {
  switch (event) {
    case SOCKET_EVENTS.ACCOUNT_REQUEST_SUBMITTED:
      return role === "super_admin" ? "/app/super-admin/account-requests" : "/app/client";
    case SOCKET_EVENTS.INSTANT_ORDER_CREATED:
    case SOCKET_EVENTS.ORDER_SUBMITTED:
      return role === "manager" ? "/app/manager" : role === "super_admin" ? "/app/super-admin" : "/";
    case SOCKET_EVENTS.FOOD_READY:
    case SOCKET_EVENTS.NO_SHOW_CHARGED:
      return role === "client" ? "/app/client/statement" : "/";
    case SOCKET_EVENTS.NO_SHOW_SWEEP:
      return role === "manager"
        ? "/app/manager/attendance"
        : role === "super_admin"
          ? "/app/super-admin/attendance"
          : "/";
    default:
      return null;
  }
}

export async function notifyEvent(event: SocketEvent, opts: {
  message: string;
  recipientRoles?: string[];
  recipientUserIds?: string[];
}) {
  const userIds = (opts.recipientUserIds ?? []).filter(Boolean);

  const [row] = await notificationRepo.insert({
    id: genId("NTF"),
    event,
    message: sanitizeText(opts.message, 300),
    recipientRoles: opts.recipientRoles ?? [],
    recipientUserIds: userIds,
  });

  const base = { id: row!.id, event, message: row!.message, createdAt: row!.createdAt, read: false };

  for (const role of opts.recipientRoles ?? []) {
    emitToRole(role, "notification:new", { ...base, link: resolveLink(event, role) });
  }
  emitToUsers(userIds, "notification:new", { ...base, link: resolveLink(event, "client") });

  return row!;
}

export async function listForUser(userId: string, role: string) {
  const rows = await notificationRepo.forUser(userId, role);
  return rows.map((n) => ({
    id: n.id,
    event: n.event,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt,
    link: resolveLink(n.event, role),
  }));
}

export const markRead = notificationRepo.markRead;
export const markAllRead = notificationRepo.markAllRead;