// admin/src/components/services/dataStore.js
import { io } from "socket.io-client";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./api";

/**
 * Same public surface as the old localStorage store (load/save/insert/update/
 * remove/subscribe), so no screen had to be restructured. Updates now arrive
 * as Socket.IO pushes instead of localStorage events — no polling anywhere.
 */
const EVENT_NAME = "cccms:datachange";

export const socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
  path: "/socket.io",
  withCredentials: true,
  transports: ["websocket", "polling"],
});

function notify(key) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { key } }));
}

socket.on("data:changed", ({ collection }) => notify(collection));

function subscribe(key, callback) {
  function onChange(e) {
    if (e.detail?.key === key) callback();
  }
  window.addEventListener(EVENT_NAME, onChange);
  return () => window.removeEventListener(EVENT_NAME, onChange);
}

const ADAPTERS = {
  // Reads go through /public/* so the Home page, MenuDetail and the token
  // board work without a login. Writes stay on the authenticated routes.
  menu: {
    get: () => apiGet("/public/menu"),
    insert: (r) => apiPost("/menu", r),
    updateById: (id, patch) => apiPatch(`/menu/${id}`, patch),
    removeById: (id) => apiDelete(`/menu/${id}`),
  },
  weeklyMenu: {
    get: () => apiGet("/public/weekly-menu"),
    save: (list) => apiPut("/menu/weekly/plan", { days: list }),
  },
  board: { get: () => apiGet("/public/board") },
  clients: {
    get: async () => (await apiGet("/clients?status=all&pageSize=200")).items,
    insert: (r) => apiPost("/clients", r),
    updateById: (id, patch) => apiPatch(`/clients/${id}`, patch),
  },
  orders: { get: async () => (await apiGet("/orders?pageSize=200")).items },
  notifications: { get: async () => (await apiGet("/notifications")).items },
  accountRequests: { get: async () => (await apiGet("/account-requests?pageSize=200")).items },
  managers: {
    get: () => apiGet("/staff/managers"),
    insert: (r) => apiPost("/staff/managers", r),
    removeById: (id) => apiDelete(`/staff/managers/${id}`),
  },
  settings: { get: () => apiGet("/public/settings") },
  mealLimit: { get: () => apiGet("/public/meal-limit") },
};

function adapterFor(key) {
  const a = ADAPTERS[key];
  if (!a) throw new Error(`dataStore: no adapter registered for "${key}"`);
  return a;
}

const cache = new Map();

export const dataStore = {
  async load(key) {
    try {
      const data = await adapterFor(key).get();
      cache.set(key, data);
      return data;
    } catch (err) {
      if (!err?.silent) console.error(`dataStore: failed to load "${key}"`, err);
      return cache.get(key) ?? [];
    }
  },

  async save(key, value) {
    const a = adapterFor(key);
    if (!a.save) throw new Error(`dataStore: "${key}" is not bulk-writable`);
    const next = await a.save(value);
    cache.set(key, next);
    notify(key);
    return next;
  },

  async insert(key, record) {
    await adapterFor(key).insert(record);
    notify(key);
    return this.load(key);
  },

  // Predicate form kept for call-site compatibility: the row is matched
  // client-side, then patched by id on the server.
  async update(key, predicate, patch) {
    const a = adapterFor(key);
    const list = cache.get(key) ?? (await this.load(key));
    const target = list.find(predicate);
    if (!target) return list;
    await a.updateById(target.id, patch);
    notify(key);
    return this.load(key);
  },

  async remove(key, predicate) {
    const a = adapterFor(key);
    const list = cache.get(key) ?? (await this.load(key));
    const target = list.find(predicate);
    if (!target) return list;
    await a.removeById(target.id);
    notify(key);
    return this.load(key);
  },

  async reset(key) {
    cache.delete(key);
    return this.load(key);
  },

  clearAll() { cache.clear(); },
  subscribe,
};