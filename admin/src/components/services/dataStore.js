import { api } from "./api";

// ---------------------------------------------------------------------------
// dataStore
//
// Purpose (per client instruction, testing phase only):
//   - All *design/reference* data ships as JSON files (public/data/*.json)
//     and is loaded once via Axios.
//   - All data the user can CREATE/EDIT/DELETE through a form is then kept in
//     localStorage, seeded from that JSON on first run, so the app behaves
//     like it has a real database while no backend/DB is connected yet.
//   - When a real backend is ready, only the `load`/`save` internals below
//     need to change (to real API calls) — every page that calls
//     dataStore.load(...) / dataStore.save(...) stays the same.
// ---------------------------------------------------------------------------

const NS = "cccms"; // localStorage namespace, avoids collisions with other apps

// ---------------------------------------------------------------------------
// Seed versioning
//
// Once a collection is cached in localStorage, `load()` never looks at the
// JSON file again — which is correct for data the USER edited, but it also
// means a developer update to a seed file (new menu items, new descriptions,
// a corrected weekly menu, etc.) would silently never appear for anyone who
// already used the app. Bumping SEED_VERSION forces exactly one reseed of
// every collection on first load after an update, then behaves normally
// (local edits after that are preserved as before).
// ---------------------------------------------------------------------------
const SEED_VERSION = "2";
const VERSION_KEY = `${NS}:seed-version`;

function ensureCurrentSeedVersion() {
  try {
    const stored = localStorage.getItem(VERSION_KEY);
    if (stored !== SEED_VERSION) {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(`${NS}:`) && k !== VERSION_KEY)
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(VERSION_KEY, SEED_VERSION);
    }
  } catch {
    // Storage unavailable (private mode, quota, etc.) — fall back to
    // whatever's already there rather than crashing.
  }
}
ensureCurrentSeedVersion();

function storageKey(key) {
  return `${NS}:${key}`;
}

function readLocal(key) {
  try {
    const raw = localStorage.getItem(storageKey(key));
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Corrupted local data must never crash the app — fall back to reseeding.
    return null;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(value));
    notify(key);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Live-update layer
//
// localStorage writes don't trigger anything in the SAME tab that made them
// (the native `storage` event only fires in OTHER tabs), so dashboards that
// only load data once on mount would go stale the moment another screen (or
// another tab logged in as a different role) changes an order. `notify`
// dispatches a same-tab CustomEvent right after every write; `subscribe`
// listens for both that same-tab event and the native cross-tab `storage`
// event, so a Client's order-progress view, a Manager's queue, and the
// public Kitchen Board all stay in sync with each other automatically.
// ---------------------------------------------------------------------------

const EVENT_NAME = "cccms:datachange";

function notify(key) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { key } }));
}

function subscribe(key, callback) {
  function onSameTabChange(e) {
    if (e.detail?.key === key) callback();
  }
  function onCrossTabChange(e) {
    if (e.key === storageKey(key)) callback();
  }
  window.addEventListener(EVENT_NAME, onSameTabChange);
  window.addEventListener("storage", onCrossTabChange);
  return () => {
    window.removeEventListener(EVENT_NAME, onSameTabChange);
    window.removeEventListener("storage", onCrossTabChange);
  };
}

export const dataStore = {
  /**
   * Loads `key` from localStorage if present; otherwise fetches the seed
   * JSON file from /public/data/<file>, stores it in localStorage, and
   * returns it. Always returns an array (empty array on total failure so
   * screens can render an empty state instead of crashing).
   */
  async load(key, file) {
    const existing = readLocal(key);
    if (existing) return existing;

    try {
      const { data } = await api.get(`/${file}`);
      writeLocal(key, data);
      return data;
    } catch (err) {
      console.error(`dataStore: failed to load seed for "${key}"`, err);
      return [];
    }
  },

  /** Overwrites the entire collection for `key`. */
  async save(key, value) {
    return writeLocal(key, value);
  },

  /** Appends one record to the collection for `key`. */
  async insert(key, record) {
    const list = readLocal(key) || [];
    const next = [...list, record];
    writeLocal(key, next);
    return next;
  },

  /** Updates the record matching `predicate` with `patch`. */
  async update(key, predicate, patch) {
    const list = readLocal(key) || [];
    const next = list.map((item) => (predicate(item) ? { ...item, ...patch } : item));
    writeLocal(key, next);
    return next;
  },

  /** Removes records matching `predicate`. */
  async remove(key, predicate) {
    const list = readLocal(key) || [];
    const next = list.filter((item) => !predicate(item));
    writeLocal(key, next);
    return next;
  },

  /** Forces a reseed from the JSON file, discarding local edits for `key`. */
  async reset(key, file) {
    try {
      const { data } = await api.get(`/${file}`);
      writeLocal(key, data);
      return data;
    } catch (err) {
      console.error(`dataStore: failed to reset "${key}"`, err);
      return [];
    }
  },

  clearAll() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(`${NS}:`))
      .forEach((k) => localStorage.removeItem(k));
  },

  /**
   * Calls `callback()` whenever `key`'s data changes — from an action in
   * this same tab, or from localStorage being changed in another tab.
   * Returns an unsubscribe function; always call it in a cleanup effect.
   */
  subscribe,
};
