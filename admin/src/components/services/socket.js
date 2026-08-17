// FILE: src/components/services/socket.js 
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

const MOCK_CHANNEL = "cccms:socket";

function createMockBus() {
  const listeners = new Map();
  let channel = null;
  try {
    if ("BroadcastChannel" in window) channel = new BroadcastChannel(MOCK_CHANNEL);
  } catch {
    channel = null;
  }

  function dispatchLocal(event, payload) {
    listeners.get(event)?.forEach((fn) => fn(payload));
  }

  if (channel) {
    channel.onmessage = (e) => {
      const { event, payload } = e.data || {};
      if (event) dispatchLocal(event, payload);
    };
  }

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
      // Same-tab listeners.
      setTimeout(() => dispatchLocal(event, payload), 0);
      // Every other open tab/role — this was the missing piece.
      try {
        channel?.postMessage({ event, payload });
      } catch {
        // Structured-clone failure or channel unavailable — same-tab
        // delivery above still works, fail silently for the rest.
      }
    },
    disconnect() {
      listeners.clear();
      channel?.close();
    },
  };
}

export const socket = SOCKET_URL
  ? io(SOCKET_URL, { autoConnect: true, transports: ["websocket"] })
  : createMockBus();

export const SOCKET_EVENTS = {
  ORDER_SUBMITTED: "order:submitted",
  MANAGER_ACCEPTED: "order:manager_accepted",
  ORDER_REJECTED: "order:rejected", 
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
  BOOKING_SUBMITTED: "booking:submitted", 
};