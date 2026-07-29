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
    return true;
  } catch {
    return false;
  }
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
};
