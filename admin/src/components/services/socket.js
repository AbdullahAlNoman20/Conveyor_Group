import { io } from "socket.io-client";

// ---------------------------------------------------------------------------
// Real-Time layer (SRS Section 6.5 / 20.4 / 14.9)
//
// Per client instruction: use Socket.IO for real-time notifications, kept
// simple, and skip standing up a real backend for now. This module exposes
// the same on/off/emit surface either way:
//   - If VITE_SOCKET_URL is set (a real backend exists), it connects for real.
//   - Otherwise it runs a tiny in-memory mock bus so every screen can already
//     be wired to live events; swapping to a real server later requires no
//     changes in the pages that call socket.on(...) / socket.emit(...).
// ---------------------------------------------------------------------------

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

function createMockBus() {
  const listeners = new Map(); // event -> Set<fn>
  return {
    isMock: true,
    connected: true,
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
      return () => listeners.get(event)?.delete(fn);
    },
    off(event, fn) {
      listeners.get(event)?.delete(fn);
    },
    emit(event, payload) {
      // Fire asynchronously so it behaves like a network round-trip even
      // though it is entirely local for this design/testing phase.
      setTimeout(() => {
        listeners.get(event)?.forEach((fn) => fn(payload));
      }, 0);
    },
    disconnect() {
      listeners.clear();
    },
  };
}

export const socket = SOCKET_URL
  ? io(SOCKET_URL, { autoConnect: true, transports: ["websocket"] })
  : createMockBus();

// Canonical event names used across modules (SRS Section 6.5.1 / 20.4).
export const SOCKET_EVENTS = {
  ORDER_SUBMITTED: "order:submitted",
  MANAGER_ACCEPTED: "order:manager_accepted",
  KITCHEN_ACCEPTED: "order:kitchen_accepted",
  PREPARATION_STARTED: "order:preparation_started",
  ESTIMATED_TIME_UPDATED: "order:eta_updated",
  FOOD_READY: "order:ready",
  FOOD_SERVED: "order:served",
  ORDER_COMPLETED: "order:completed",
  ORDER_CANCELLED: "order:cancelled",
  ORDER_DELAYED: "order:delayed",
  GUEST_REQUEST_SUBMITTED: "guest_request:submitted",
  GUEST_REQUEST_APPROVED: "guest_request:approved",
  WALLET_RECHARGED: "wallet:recharged",
};
