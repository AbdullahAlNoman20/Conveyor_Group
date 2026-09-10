// admin/src/components/services/api.js
import axios from "axios";

// Cookies carry the session (httpOnly + SameSite=Strict), so withCredentials
// must be on. CSRF uses a double-submit token: the readable `cccms_csrf`
// cookie is echoed back in the x-csrf-token header on every write.
const BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

function readCookie(name) {
  return document.cookie.split("; ").find((r) => r.startsWith(`${name}=`))?.split("=")[1];
}

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();
  if (!["get", "head", "options"].includes(method)) {
    const token = readCookie("cccms_csrf");
    if (token) config.headers["x-csrf-token"] = token;
  }
  return config;
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