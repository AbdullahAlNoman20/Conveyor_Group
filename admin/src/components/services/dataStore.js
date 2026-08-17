import { api } from "./api";

const NS = "cccms";

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
  } catch {}
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
  async load(key, file) {
    const existing = readLocal(key);
    if (existing) return existing;

    try {
      const { data } = await api.get(`/${file}`);

      if (typeof data === "string") {
        throw new Error(`Seed file "${file}" did not return JSON`);
      }
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
    const next = list.map((item) =>
      predicate(item) ? { ...item, ...patch } : item,
    );
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
      if (typeof data === "string") {
        throw new Error(`Seed file "${file}" did not return JSON`);
      }
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

  subscribe,
};
