// FILE: src/components/services/settings.js  (NEW)
import { useEffect, useState } from "react";

// Restaurant Settings are a single object (not a dataStore "collection"),
// so they get their own tiny read/write/subscribe layer instead of reusing
// dataStore's array-based insert/update/remove API.

const KEY = "cccms:settingsObj";
const DEFAULTS = {
  restaurantName: "Conveyor Group Restaurant",
  invoicePrefix: "INV",
  taxRate: 5,
  emailNotifications: true,
  smsNotifications: false,
  displayNameOnBoard: "token_only",
};

const listeners = new Set();

export function readSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeSettings(next) {
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((fn) => fn(next));
}

/** Live-updating settings — any component using this re-renders the instant
 * Super Admin saves new settings (same tab), and also across browser tabs
 * via the native `storage` event. Used anywhere a value like taxRate needs
 * to actually affect calculations app-wide instead of sitting unused. */
export function useSettings() {
  const [settings, setSettings] = useState(readSettings);

  useEffect(() => {
    listeners.add(setSettings);
    function onStorage(e) {
      if (e.key === KEY) setSettings(readSettings());
    }
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(setSettings);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return settings;
}