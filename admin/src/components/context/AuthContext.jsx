import { createContext, useEffect, useMemo, useState } from "react";
import { dataStore } from "../services/dataStore";
import { ROLES } from "../constants/roles";

export const AuthContext = createContext(null);

const SESSION_KEY = "cccms:session";
const DEMO_PASSWORD = "Demo@123"; // testing-phase only, no real auth backend yet
const VALID_ROLES = Object.values(ROLES);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) setUser(JSON.parse(raw));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Keep the in-memory session's photo (and other display fields) in sync
  // with the `users` collection — a profile-photo change elsewhere in this
  // tab, or a same-tab dataStore write, should reflect in the Navbar avatar
  // immediately without forcing a logout/login.
  useEffect(() => {
    if (!user) return;
    const unsubscribe = dataStore.subscribe("users", async () => {
      const users = await dataStore.load("users", "users.json");
      const fresh = users.find((u) => u.id === user.id);
      if (fresh) {
        const session = { ...fresh };
        delete session.password;
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        setUser(session);
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function login(email, password) {
    const users = await dataStore.load("users", "users.json");
    const match = users.find(
      (u) => u.email.toLowerCase() === String(email).toLowerCase()
    );

    if (!match) {
      return { success: false, message: "No account found with that email." };
    }
    if (match.status !== "active") {
      return { success: false, message: "This account has been suspended. Contact Super Admin." };
    }
    // Testing-phase only: every seeded demo account shares one demo password.
    if (password !== DEMO_PASSWORD) {
      return { success: false, message: "Incorrect password." };
    }

    const session = { ...match };
    delete session.password;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return { success: true, user: session };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
