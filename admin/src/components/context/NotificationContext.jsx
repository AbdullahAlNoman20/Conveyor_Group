// admin/src/components/context/NotificationContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost } from "../services/api";
import { socket } from "../services/dataStore";
import { playAlertSound, requestBrowserPermission, showBrowserNotification } from "../services/notify";
import { ToastContext } from "./ToastContext";
import { useAuth } from "../hooks/useAuth";

export const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const toastCtx = useContext(ToastContext);
  const { user } = useAuth();
  const primed = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); setUnreadCount(0); return; }
    try {
      const data = await apiGet("/notifications");
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch { /* stay on the last good list */ }
  }, [user]);

  useEffect(() => {
    primed.current = false;
    refresh();
  }, [refresh]);

  // Targeting is done server-side by user id, so anything that arrives here
  // is genuinely for this person — no client-side name filtering needed.
  useEffect(() => {
    if (!user) return;
    function onNew(n) {
      setItems((list) => [n, ...list]);
      setUnreadCount((c) => c + 1);
      if (primed.current) {
        toastCtx?.push(n.message, "info");
        playAlertSound();
        if (document.hidden) {
          showBrowserNotification("CCCMS", { body: n.message });
        }
      }
    }
    // Permission was never requested, so showBrowserNotification() silently
    // no-opped on every browser. Asking once per signed-in session fixes it.
    requestBrowserPermission().catch(() => undefined);

    primed.current = true;
    socket.on("notification:new", onNew);
    return () => socket.off("notification:new", onNew);
  }, [user, toastCtx]);

  async function markAllRead() {
    await apiPost("/notifications/read-all").catch(() => undefined);
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function markOneRead(id) {
    await apiPost(`/notifications/${id}/read`).catch(() => undefined);
    setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  const value = useMemo(
    () => ({ items, unreadCount, markAllRead, markOneRead }),
    [items, unreadCount]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}