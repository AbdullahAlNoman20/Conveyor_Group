// admin/src/components/context/AuthContext.jsx
import { createContext, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../services/api";
import { ROLES } from "../constants/roles";

export const AuthContext = createContext(null);

const SESSION_KEY = "cccms:session";
const VALID_ROLES = Object.values(ROLES);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // localStorage is only a first-paint hint; the cookie is the truth.
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) setUser(JSON.parse(raw));
        const fresh = await apiGet("/auth/me");
        if (fresh && VALID_ROLES.includes(fresh.role)) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
          setUser(fresh);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();

    function onExpired() {
      clearCsrfToken();
      localStorage.removeItem(SESSION_KEY);
      setUser(null);
    }
    window.addEventListener("cccms:session-expired", onExpired);
    return () => window.removeEventListener("cccms:session-expired", onExpired);
  }, []);

  // Photo/name change elsewhere refreshes the header avatar without a re-login.
  useEffect(() => {
    async function resync() {
      try {
        const fresh = await apiGet("/auth/me");
        if (fresh) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
          setUser(fresh);
        }
      } catch { /* handled by the expiry listener */ }
    }
    window.addEventListener("cccms:profile-updated", resync);
    return () => window.removeEventListener("cccms:profile-updated", resync);
  }, []);

  async function login(email, password) {
    try {
      const data = await apiPost("/auth/login", { email, password });
      localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      // Wording comes from the server's error registry, so the messages the
      // user sees are identical to the old local checks.
      return { success: false, message: err.message, code: err.code };
    }
  }

  async function logout() {
    // Clear locally FIRST so the UI can never end up showing a signed-in state
    // after a failed network call.
    clearCsrfToken();
    localStorage.removeItem(SESSION_KEY);
    setUser(null);

    try {
      await apiPost("/auth/logout");
    } catch (err) {
      // The cookies live on the API origin, so if this call didn't land the
      // browser may still hold a valid session. Surfacing it beats pretending.
      console.error("logout request failed — session may still be active", err);
    }
  }

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}