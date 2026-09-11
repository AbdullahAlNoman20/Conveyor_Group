// admin/src/components/context/AuthContext.jsx
import { createContext, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, clearCsrfToken } from "../services/api";
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
        clearCsrfToken();
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

  // A photo or name change elsewhere refreshes the header avatar without
  // forcing a re-login.
  useEffect(() => {
    async function resync() {
      try {
        const fresh = await apiGet("/auth/me");
        if (fresh) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
          setUser(fresh);
        }
      } catch {
        /* a stale session is handled by the expiry listener above */
      }
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
      // user sees match what the local checks used to show.
      return { success: false, message: err.message, code: err.code };
    }
  }

  async function logout() {
    // The server call goes FIRST, while the CSRF token is still available —
    // clearing local state beforehand stripped the header and the request came
    // back 403, so the session cookie was never actually revoked.
    try {
      await apiPost("/auth/logout");
    } catch (err) {
      // Cookies live on the API origin, so a failed call can leave the browser
      // holding a live session. Surfacing it beats pretending.
      console.error("logout request failed — session may still be active", err);
    }

    clearCsrfToken();
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}