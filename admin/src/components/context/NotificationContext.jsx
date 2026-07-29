import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { socket, SOCKET_EVENTS } from "../services/socket";
import { playAlertSound, showBrowserNotification } from "../services/notify";
import { ToastContext } from "./ToastContext";
import { dataStore } from "../services/dataStore";

export const NotificationContext = createContext(null);

// Maps a subset of live socket events to a human-readable, role-agnostic
// message. Individual modules can still subscribe to `socket` directly for
// anything more specific (e.g. updating a live countdown timer).
const EVENT_COPY = {
  [SOCKET_EVENTS.MANAGER_ACCEPTED]: "Manager accepted your order.",
  [SOCKET_EVENTS.KITCHEN_ACCEPTED]: "Kitchen accepted your order.",
  [SOCKET_EVENTS.PREPARATION_STARTED]: "Cooking started for your order.",
  [SOCKET_EVENTS.FOOD_READY]: "Your food is ready — please collect.",
  [SOCKET_EVENTS.FOOD_SERVED]: "Your order has been served.",
  [SOCKET_EVENTS.ORDER_DELAYED]: "Your order has been delayed.",
  [SOCKET_EVENTS.GUEST_REQUEST_APPROVED]: "Your guest request was approved.",
  [SOCKET_EVENTS.WALLET_RECHARGED]: "Your wallet has been recharged.",
};

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const toastCtx = useContext(ToastContext);

  useEffect(() => {
    (async () => {
      const seeded = await dataStore.load("notifications", "notifications.json");
      setItems(seeded);
    })();
  }, []);

  useEffect(() => {
    const unsubs = Object.entries(EVENT_COPY).map(([event, message]) =>
      socket.on(event, (payload) => {
        const entry = {
          id: `${event}-${Date.now()}`,
          message: payload?.message || message,
          event,
          read: false,
          createdAt: new Date().toISOString(),
        };
        setItems((list) => [entry, ...list].slice(0, 50));
        toastCtx?.push(entry.message, "info");
        showBrowserNotification("CCCMS", { body: entry.message });
        playAlertSound();
      })
    );
    return () => unsubs.forEach((off) => typeof off === "function" && off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function markAllRead() {
    setItems((list) => list.map((i) => ({ ...i, read: true })));
  }

  const unreadCount = items.filter((i) => !i.read).length;

  const value = useMemo(
    () => ({ items, unreadCount, markAllRead }),
    [items, unreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
