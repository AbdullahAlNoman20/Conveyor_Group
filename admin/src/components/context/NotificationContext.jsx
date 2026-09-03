import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SOCKET_EVENTS } from "../services/socket";
import { playAlertSound, showBrowserNotification } from "../services/notify";
import { ToastContext } from "./ToastContext";
import { dataStore } from "../services/dataStore";
import { useAuth } from "../hooks/useAuth";

export const NotificationContext = createContext(null);

const EVENT_COPY = {
  [SOCKET_EVENTS.ACCOUNT_REQUEST_SUBMITTED]: "A new account request needs your review.",
  [SOCKET_EVENTS.INSTANT_ORDER_CREATED]: "A fixed-meal order was placed.",
  [SOCKET_EVENTS.FOOD_READY]: "Your order is ready for collection.",
};

function resolveLink(event, role) {
  switch (event) {
    case SOCKET_EVENTS.ACCOUNT_REQUEST_SUBMITTED:
      return role === "super_admin" ? "/app/super-admin/account-requests" : "/app/client";
    case SOCKET_EVENTS.INSTANT_ORDER_CREATED:
      return role === "manager" ? "/app/manager" : role === "super_admin" ? "/app/super-admin" : "/";
    case SOCKET_EVENTS.FOOD_READY:
      return role === "client" ? "/app/client/orders" : "/";
    default:
      return null;
  }
}

function recipientId(user) {
  return user?.id || user?.name || null;
}

// Strict targeting: a notification only reaches the intended client/role,
// never everyone. recipientNames must match the user's own name exactly.
function isForUser(entry, user) {
  if (!entry || !user) return false;
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

  useEffect(() => {
    seenIdsRef.current = null;
  }, [user?.id, user?.name, user?.role]);

  const mine = useMemo(() => {
    if (!user) return [];
    return all.filter((n) => isForUser(n, user)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [all, user]);

  const myId = recipientId(user);

  useEffect(() => {
    if (!user) return;
    const currentIds = new Set(mine.map((n) => n.id));

    if (seenIdsRef.current === null) {
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
      newOnes.forEach((n) => toastCtx?.push(n.message, "info"));
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
  const value = useMemo(() => ({ items, unreadCount, markAllRead, markOneRead }), [items, unreadCount, myId]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}