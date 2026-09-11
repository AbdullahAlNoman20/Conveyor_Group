// admin/src/components/services/api.js
import axios from "axios";

// Cookies carry the session (httpOnly + SameSite=Strict), so withCredentials
// must be on. CSRF uses a double-submit token: the readable `cccms_csrf`
// cookie is echoed back in the x-csrf-token header on every write.
// A trailing slash in the env var turns every path into a double slash, which
// Fastify 404s on.
const BASE_URL = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/+$/, "");

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

const CSRF_KEY = "cccms:csrf";

function readCookie(name) {
  return document.cookie.split("; ").find((r) => r.startsWith(`${name}=`))?.split("=")[1];
}

/**
 * The double-submit CSRF token.
 *
 * The cookie is set by the API origin, so when the frontend is served from a
 * DIFFERENT origin (two Render subdomains) document.cookie can't read it and
 * the header would never be sent. The browser still SENDS the cookie to the
 * API, so the server-side comparison stays valid — the client just has to
 * remember the value it was handed at login instead of reading it back.
 *
 * Same-origin deploys keep working via the cookie fallback.
 */
export function setCsrfToken(token) {
  if (!token) return;
  try {
    sessionStorage.setItem(CSRF_KEY, token);
  } catch {
    /* private mode — the cookie fallback still covers same-origin */
  }
}

export function clearCsrfToken() {
  try {
    sessionStorage.removeItem(CSRF_KEY);
  } catch {
    /* nothing to clear */
  }
}

function getCsrfToken() {
  try {
    return sessionStorage.getItem(CSRF_KEY) || readCookie("cccms_csrf") || null;
  } catch {
    return readCookie("cccms_csrf") || null;
  }
}

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();
  if (!["get", "head", "options"].includes(method)) {
    const token = getCsrfToken();
    if (token) config.headers["x-csrf-token"] = token;
  }
  return config;
});

// Every response that mints a new token carries it in the body — capture it
// centrally so login and refresh both stay in sync.
api.interceptors.response.use((res) => {
  const token = res?.data?.data?.csrfToken;
  if (token) setCsrfToken(token);
  return res;
});

// Single-flight refresh: a burst of 401s triggers exactly one /auth/refresh.
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;

    if (status === 401 && code === "TOKEN_EXPIRED" && !original.__retried) {
      original.__retried = true;
      refreshing ??= api.post("/auth/refresh").finally(() => { refreshing = null; });
      try {
        await refreshing;
        return api(original);
      } catch {
        window.dispatchEvent(new CustomEvent("cccms:session-expired"));
      }
    }

    // A 401 on /auth/me simply means "not signed in yet" — it's how the app
    // probes for an existing session on boot, not a failure worth logging.
    if (status === 401 && (original.url || "").includes("/auth/me")) {
      return Promise.reject({ code: "UNAUTHENTICATED", status, silent: true, message: "" });
    }

    return Promise.reject({
      code: code || "INTERNAL_ERROR",
      status,
      message:
        error.response?.data?.error?.message ||
        error.message ||
        "Something went wrong while loading data.",
      details: error.response?.data?.error?.details || {},
    });
  }
);

export async function apiGet(path, config) {
  return (await api.get(path, config)).data?.data;
}
export async function apiPost(path, body, config) {
  return (await api.post(path, body, config)).data?.data;
}
export async function apiPatch(path, body, config) {
  return (await api.patch(path, body, config)).data?.data;
}
export async function apiPut(path, body, config) {
  return (await api.put(path, body, config)).data?.data;
}
export async function apiDelete(path, config) {
  return (await api.delete(path, config)).data?.data;
}

/** Multipart upload -> returns { path } for Supabase. Never a base64 data URL. */
export async function uploadFile(kind, file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(`/uploads/${kind}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });
  return data?.data;
}