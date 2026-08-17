// FILE: src/components/context/NotificationContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { socket, SOCKET_EVENTS } from "../services/socket";
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
  [SOCKET_EVENTS.GUEST_REQUEST_SUBMITTED]:
    "A guest request needs your approval.",
  [SOCKET_EVENTS.GUEST_REQUEST_APPROVED]: "Your guest request was approved.",
  [SOCKET_EVENTS.WALLET_RECHARGED]: "Your wallet has been recharged.",
  [SOCKET_EVENTS.BOOKING_SUBMITTED]:
    "A new meal pre-booking needs your approval.",
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
      return role === "manager"
        ? "/app/manager/guest-requests"
        : ORDER_EVENT_LINKS[role] || "/";
    case SOCKET_EVENTS.GUEST_REQUEST_APPROVED:
      return role === "client"
        ? "/app/client/guest-request"
        : "/app/manager/guest-requests";
    case SOCKET_EVENTS.WALLET_RECHARGED:
      return role === "client"
        ? "/app/client/wallet"
        : "/app/manager/wallet-recharge";
    case SOCKET_EVENTS.BOOKING_SUBMITTED:
      return role === "manager"
        ? "/app/manager/pre-bookings"
        : "/app/client/pre-booking";
    default:
      return null;
  }
}

function isForCurrentUser(payload, user) {
  if (!payload) return false;
  if (payload.global) return true;
  const roleMatch = payload.recipientRoles?.includes(user?.role);
  const nameMatch = payload.recipientNames?.includes(user?.name);
  return Boolean(roleMatch || nameMatch);
}

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const toastCtx = useContext(ToastContext);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const seeded = await dataStore.load(
        "notifications",
        "notifications.json",
      );
      setItems(seeded);
    })();
  }, []);

  useEffect(() => {
    const unsubs = Object.entries(EVENT_COPY).map(([event, message]) =>
      socket.on(event, (payload) => {
        if (!isForCurrentUser(payload, user)) return;
        const entry = {
          id: `${event}-${Date.now()}`,
          message: payload?.message || message,
          event,
          link: resolveLink(event, user?.role),
          read: false,
          createdAt: new Date().toISOString(),
        };
        setItems((list) => [entry, ...list].slice(0, 50));
        toastCtx?.push(entry.message, "info");
        showBrowserNotification("CCCMS", { body: entry.message });
        playAlertSound();
      }),
    );
    return () => unsubs.forEach((off) => typeof off === "function" && off());
  }, [user?.role]);

  function markAllRead() {
    setItems((list) => list.map((i) => ({ ...i, read: true })));
  }
  function markOneRead(id) {
    setItems((list) =>
      list.map((i) => (i.id === id ? { ...i, read: true } : i)),
    );
  }

  const unreadCount = items.filter((i) => !i.read).length;
  const value = useMemo(
    () => ({ items, unreadCount, markAllRead, markOneRead }),
    [items, unreadCount],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
