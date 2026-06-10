import axios, {
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import router from "@/router";

// ════════════════════════════════════════════════════════════
// TOKEN UTILITIES
// ════════════════════════════════════════════════════════════

/** Parse JWT payload without verifying signature (client-side only) */
function parseJwt(token: string): Record<string, any> | null {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Returns seconds until token expires (negative = already expired) */
function tokenExpiresIn(token: string): number {
  const payload = parseJwt(token);
  if (!payload?.exp) return -1;
  return payload.exp - Math.floor(Date.now() / 1000);
}

/** True if token is expired or will expire within `bufferSec` seconds */
function isTokenExpiredOrSoon(token: string, bufferSec = 60): boolean {
  return tokenExpiresIn(token) < bufferSec;
}

/** True if refresh token is fully expired */
function isRefreshTokenExpired(): boolean {
  const rt = localStorage.getItem("refresh_token");
  if (!rt) return true;
  return tokenExpiresIn(rt) <= 0;
}

// ════════════════════════════════════════════════════════════
// OFFLINE QUEUE
// ════════════════════════════════════════════════════════════
interface QueuedRequest {
  id: string;
  config: AxiosRequestConfig;
  timestamp: number;
  retries: number;
}

const OFFLINE_QUEUE_KEY = "glms_offline_queue";
const MAX_RETRIES = 3;
const MAX_QUEUE_AGE_MS = 24 * 60 * 60 * 1000; // 24h

function loadQueue(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedRequest[]) {
  const clean = queue.filter(
    (r) =>
      ["POST", "PATCH", "PUT", "DELETE"].includes(
        (r.config.method || "").toUpperCase(),
      ) && Date.now() - r.timestamp < MAX_QUEUE_AGE_MS,
  );
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(clean));
}

function addToQueue(config: AxiosRequestConfig) {
  const queue = loadQueue();
  queue.push({
    id: crypto.randomUUID(),
    config,
    timestamp: Date.now(),
    retries: 0,
  });
  saveQueue(queue);
}

export async function replayOfflineQueue() {
  const queue = loadQueue();
  if (!queue.length) return 0;
  const remaining: QueuedRequest[] = [];
  for (const item of queue) {
    try {
      await api(item.config);
    } catch {
      item.retries++;
      if (item.retries < MAX_RETRIES) remaining.push(item);
    }
  }
  saveQueue(remaining);
  return remaining.length;
}

export function getQueuedCount(): number {
  return loadQueue().length;
}

// ════════════════════════════════════════════════════════════
// AXIOS INSTANCE
// ════════════════════════════════════════════════════════════
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const api = axios.create({ baseURL: BASE_URL, timeout: 30_000 });

// ── Token refresh state ────────────────────────────────────────
let isRefreshing = false;
let failedQueue: { resolve: (t: string) => void; reject: (e: any) => void }[] =
  [];

async function doRefresh(): Promise<string> {
  const rt = localStorage.getItem("refresh_token");
  if (!rt) throw new Error("NO_REFRESH_TOKEN");
  if (isRefreshTokenExpired()) throw new Error("REFRESH_TOKEN_EXPIRED");

  const res = await axios.post(`${BASE_URL}/auth/refresh`, {
    refreshToken: rt,
  });
  const newToken = res.data?.data?.accessToken || res.data?.accessToken;
  if (!newToken) throw new Error("NO_ACCESS_TOKEN_IN_RESPONSE");

  localStorage.setItem("access_token", newToken);
  return newToken;
}

function forceLogout(reason: string) {
  console.warn("[GLMS] Forced logout:", reason);
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  failedQueue.forEach((p) => p.reject(new Error(reason)));
  failedQueue = [];
  isRefreshing = false;

  // Show session expired message via URL param
  const current = router.currentRoute.value.fullPath;
  if (current !== "/login") {
    router.push({ path: "/login", query: { reason: "session_expired" } });
  }
}

// ════════════════════════════════════════════════════════════
// REQUEST INTERCEPTOR
// Proactive check: refresh token BEFORE sending if expiring soon
// ════════════════════════════════════════════════════════════
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("access_token");

    // Skip auth for /auth/login, /auth/refresh, /auth/logout
    const isAuthEndpoint = ["/auth/login", "/auth/refresh"].some((p) =>
      config.url?.includes(p),
    );
    if (isAuthEndpoint) return config;

    if (!token) return config; // Let response interceptor handle 401

    // ── Proactive: token expiring within 60s → refresh now ────
    if (isTokenExpiredOrSoon(token, 60)) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await doRefresh();
          isRefreshing = false;
          failedQueue.forEach((p) => p.resolve(newToken));
          failedQueue = [];
          config.headers.Authorization = `Bearer ${newToken}`;
          return config;
        } catch (err: any) {
          forceLogout(err.message || "TOKEN_REFRESH_FAILED");
          return Promise.reject(err);
        }
      } else {
        // Another refresh in progress — wait for it
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (newToken) => {
              config.headers.Authorization = `Bearer ${newToken}`;
              resolve(config);
            },
            reject,
          });
        });
      }
    }

    // Token still valid
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err),
);

// ════════════════════════════════════════════════════════════
// RESPONSE INTERCEPTOR
// Reactive: handle 401 that slipped through (race condition)
// ════════════════════════════════════════════════════════════
api.interceptors.response.use(
  // Unwrap response envelope
  (res) => (res.data?.data !== undefined ? res.data : res),

  async (err) => {
    const original = err.config as AxiosRequestConfig & { _retry?: boolean };

    // ── Network / offline error ────────────────────────────────
    if (!err.response) {
      const isOffline =
        !navigator.onLine ||
        err.code === "ERR_NETWORK" ||
        err.code === "ECONNABORTED" ||
        err.code === "ERR_INTERNET_DISCONNECTED";

      if (isOffline) {
        const method = (original?.method || "").toUpperCase();
        if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
          addToQueue(original);
          return Promise.reject({
            offline: true,
            queued: true,
            message:
              "បណ្ដាញអ៊ីនធឺណែតដាច់ — Request saved, will retry when online.",
          });
        }
        return Promise.reject({
          offline: true,
          queued: false,
          message: "No internet connection — គ្មានអ៊ីនធឺណែត.",
        });
      }
    }

    // ── 401: token expired (reactive fallback) ─────────────────
    if (err.response?.status === 401 && !original?._retry) {
      // Check if it's actually a token issue
      const errMsg = err.response?.data?.message || "";
      const isTokenErr =
        errMsg.includes("expired") ||
        errMsg.includes("invalid") ||
        errMsg.includes("Unauthorized");

      // If refresh token itself is expired → force logout
      if (isRefreshTokenExpired()) {
        forceLogout("REFRESH_TOKEN_EXPIRED");
        return Promise.reject({
          sessionExpired: true,
          message: "Session expired. Please login again.",
        });
      }

      // Queue parallel requests while refreshing
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              original.headers = {
                ...original.headers,
                Authorization: `Bearer ${token}`,
              };
              resolve(api(original));
            },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const newToken = await doRefresh();
        isRefreshing = false;
        failedQueue.forEach((p) => p.resolve(newToken));
        failedQueue = [];
        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${newToken}`,
        };
        return api(original);
      } catch (refreshErr: any) {
        forceLogout(refreshErr.message || "REFRESH_FAILED");
        return Promise.reject({
          sessionExpired: true,
          message: "Session expired. Please login again.",
        });
      }
    }

    // ── 403 Forbidden ──────────────────────────────────────────
    if (err.response?.status === 403) {
      return Promise.reject({
        forbidden: true,
        message:
          err.response?.data?.message || "Access denied — គ្មានសិទ្ធិចូលប្រើ",
      });
    }

    return Promise.reject(err?.response?.data || err);
  },
);

// ── Auto-replay when back online ───────────────────────────────
window.addEventListener("online", async () => {
  const remaining = await replayOfflineQueue();
  if (remaining === 0) console.log("[GLMS] All queued requests replayed");
});

export default api;
