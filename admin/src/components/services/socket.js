// admin/src/components/services/socket.js
export { socket } from "./dataStore";

export const SOCKET_EVENTS = {
  ACCOUNT_REQUEST_SUBMITTED: "account_request:submitted",
  INSTANT_ORDER_CREATED: "order:instant_created",
  FOOD_READY: "order:ready",
  // FIX: PlaceOrder.jsx referenced this but it was never defined, so every
  // manual order wrote a notification row with event === undefined.
  ORDER_SUBMITTED: "order:submitted",
  ORDER_STATUS_CHANGED: "order:status_changed",
};