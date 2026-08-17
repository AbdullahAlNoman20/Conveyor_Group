import { dataStore } from "./dataStore";

export async function notifyEvent(event, { message, recipientRoles = [], recipientNames = [] } = {}) {
  const entry = {
    id: `${event}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    event,
    message,
    recipientRoles,
    recipientNames,
    readBy: [],
    createdAt: new Date().toISOString(),
  };
  await dataStore.insert("notifications", entry);
  return entry;
}