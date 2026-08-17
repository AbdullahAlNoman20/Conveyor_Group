import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SOCKET_EVENTS } from "../services/socket";
import { playAlertSound, showBrowserNotification } from "../services/notify";
import { ToastContext } from "./ToastContext";
import { dataStore } from "../services/dataStore";
import { useAuth } from "../hooks/useAuth";

export const NotificationContext = createContext(null);

const EVENT_COPY = {
  [SOCKET_EVENTS.ORDER_SUBMITTED]: "A new order needs your approval.",
  [SOCKET_EVENTS.MANAGER_ACCEPTED]: "Manager accepted your order.",
  [SOCKET_EVENTS.ORDER_REJECTED]: "Your order was rejected by the Manager.",
  [SOCKET_EVENTS.KITCHEN_ACCEPTED]: "Kitchen accepted your order.",
  [SOCKET_EVENTS.PREPARATION_STARTED]: "Cooking started for your order.",
  [SOCKET_EVENTS.FOOD_READY]: "Your food is ready — please collect.",
  [SOCKET_EVENTS.FOOD_SERVED]: "Your order has been served.",
  [SOCKET_EVENTS.ORDER_COMPLETED]: "Your order has been completed. Thank you!",
  [SOCKET_EVENTS.ORDER_DELAYED]: "Your order has been delayed.",
  [SOCKET_EVENTS.ORDER_CANCELLED]: "An order was cancelled.",
  [SOCKET_EVENTS.GUEST_REQUEST_SUBMITTED]: "A guest request needs your approval.",
  [SOCKET_EVENTS.GUEST_REQUEST_APPROVED]: "Your guest request was approved.",
  [SOCKET_EVENTS.WALLET_RECHARGED]: "Your wallet has been recharged.",
  [SOCKET_EVENTS.BOOKING_SUBMITTED]: "A new meal pre-booking needs your approval.",
};

const ORDER_EVENT_LINKS = {
  super_admin: "/app/super-admin/reports",
  manager: "/app/manager",
  kitchen_head: "/app/kitchen/queue",
  waiter: "/app/waiter",
  client: "/app/client/orders",
  guest: "/app/guest/orders",
};

function resolveLink(event, role) {
  switch (event) {
    case SOCKET_EVENTS.ORDER_SUBMITTED:
      return role === "manager"
        ? "/app/manager/order-approvals"
        : role === "kitchen_head"
          ? "/app/kitchen/queue"
          : ORDER_EVENT_LINKS[role] || "/";
    case SOCKET_EVENTS.MANAGER_ACCEPTED:
    case SOCKET_EVENTS.ORDER_REJECTED:
    case SOCKET_EVENTS.KITCHEN_ACCEPTED:
    case SOCKET_EVENTS.PREPARATION_STARTED:
    case SOCKET_EVENTS.FOOD_READY:
    case SOCKET_EVENTS.FOOD_SERVED:
    case SOCKET_EVENTS.ORDER_COMPLETED:
    case SOCKET_EVENTS.ORDER_DELAYED:
    case SOCKET_EVENTS.ORDER_CANCELLED:
      return ORDER_EVENT_LINKS[role] || "/";
    case SOCKET_EVENTS.GUEST_REQUEST_SUBMITTED:
      return role === "manager" ? "/app/manager/guest-requests" : ORDER_EVENT_LINKS[role] || "/";
    case SOCKET_EVENTS.GUEST_REQUEST_APPROVED:
      return role === "client" ? "/app/client/guest-request" : "/app/manager/guest-requests";
    case SOCKET_EVENTS.WALLET_RECHARGED:
      return role === "client" ? "/app/client/wallet" : "/app/manager/wallet-recharge";
    case SOCKET_EVENTS.BOOKING_SUBMITTED:
      return role === "manager" ? "/app/manager/pre-bookings" : "/app/client/pre-booking";
    default:
      return null;
  }
}

function recipientId(user) {
  return user?.id || user?.name || null;
}

function isForUser(entry, user) {
  if (!entry || !user) return false;
  if (entry.global) return true;
  const roleMatch = entry.recipientRoles?.includes(user.role);
  const nameMatch = entry.recipientNames?.includes(user.name);
  return Boolean(roleMatch || nameMatch);
}

export function NotificationProvider({ children }) {
  const [all, setAll] = useState([]);
  const toastCtx = useContext(ToastContext);
  const { user } = useAuth();
  const seenIdsRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const initial = await dataStore.load("notifications", "notifications.json");
      if (mounted) setAll(initial);
    })();
    const unsubscribe = dataStore.subscribe("notifications", async () => {
      const fresh = await dataStore.load("notifications", "notifications.json");
      if (mounted) setAll(fresh);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Reset the "already alerted" tracker whenever the logged-in user
  // changes, so a fresh login always re-evaluates pending unread items.
  useEffect(() => {
    seenIdsRef.current = null;
  }, [user?.id, user?.name, user?.role]);

  const mine = useMemo(() => {
    if (!user) return [];
    return all
      .filter((n) => isForUser(n, user))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [all, user]);

  const myId = recipientId(user);

  useEffect(() => {
    if (!user) return;
    const currentIds = new Set(mine.map((n) => n.id));

    if (seenIdsRef.current === null) {
      // Fresh login/mount — alert once for anything still unread.
      const hasUnread = mine.some((n) => !n.readBy?.includes(myId));
      if (hasUnread) {
        playAlertSound();
        showBrowserNotification("CCCMS", { body: "You have notifications waiting." });
      }
      seenIdsRef.current = currentIds;
      return;
    }

    const newOnes = mine.filter((n) => !seenIdsRef.current.has(n.id));
    if (newOnes.length > 0) {
      newOnes.forEach((n) => {
        toastCtx?.push(n.message, "info");
        showBrowserNotification("CCCMS", { body: n.message });
      });
      playAlertSound();
    }
    seenIdsRef.current = currentIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, myId]);

  async function markAllRead() {
    if (!myId) return;
    const current = await dataStore.load("notifications", "notifications.json");
    let changed = false;
    const next = current.map((n) => {
      if (isForUser(n, user) && !n.readBy?.includes(myId)) {
        changed = true;
        return { ...n, readBy: [...(n.readBy || []), myId] };
      }
      return n;
    });
    if (changed) await dataStore.save("notifications", next);
  }

  async function markOneRead(id) {
    if (!myId) return;
    const current = await dataStore.load("notifications", "notifications.json");
    let changed = false;
    const next = current.map((n) => {
      if (n.id === id && !n.readBy?.includes(myId)) {
        changed = true;
        return { ...n, readBy: [...(n.readBy || []), myId] };
      }
      return n;
    });
    if (changed) await dataStore.save("notifications", next);
  }

  const items = useMemo(
    () =>
      mine.map((n) => ({
        ...n,
        message: n.message || EVENT_COPY[n.event] || "Update",
        link: resolveLink(n.event, user?.role),
        read: Boolean(n.readBy?.includes(myId)),
      })),
    [mine, user?.role, myId]
  );

  const unreadCount = items.filter((i) => !i.read).length;

  const value = useMemo(
    () => ({ items, unreadCount, markAllRead, markOneRead }),
    [items, unreadCount, myId]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}