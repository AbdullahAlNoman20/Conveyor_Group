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
      setTimeout(() => dispatchLocal(event, payload), 0);
      try {
        channel?.postMessage({ event, payload });
      } catch {
        // fail silently for the mock bus
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

// Only the events actually used by the single supported workflow:
// register -> approve/reject -> instant fixed-meal order.
export const SOCKET_EVENTS = {
  ACCOUNT_REQUEST_SUBMITTED: "account_request:submitted",
  INSTANT_ORDER_CREATED: "order:instant_created",
  FOOD_READY: "order:ready",
};