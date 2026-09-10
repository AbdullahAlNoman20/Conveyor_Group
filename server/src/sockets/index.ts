// backend/src/sockets/index.ts
import { Server as SocketServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { redisPub, redisSub } from "../lib/redis.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { ACCESS_COOKIE } from "../middleware/auth.js";

let io: SocketServer | null = null;

// Debounced pushes — a burst of scans must not flood every display.
const pending = new Map<string, NodeJS.Timeout>();
function debounce(key: string, ms: number, fn: () => void): void {
  clearTimeout(pending.get(key));
  pending.set(key, setTimeout(() => { pending.delete(key); fn(); }, ms));
}

function parseCookies(raw = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k] = decodeURIComponent(v.join("="));
  }
  return out;
}

export function initSockets(app: FastifyInstance): SocketServer {
  io = new SocketServer(app.server, {
    path: "/socket.io",
    cors: { origin: env.APP_PUBLIC_URL, credentials: true },
    pingInterval: 25_000,
    pingTimeout: 20_000,
    maxHttpBufferSize: 1e5,
    transports: ["websocket", "polling"],
  });

  io.adapter(createAdapter(redisPub, redisSub));

  io.use(async (socket, next) => {
    // The public token board connects anonymously; it only joins "board".
    try {
      const token = parseCookies(socket.handshake.headers.cookie)[ACCESS_COOKIE];
      if (token) {
        const claims = await verifyAccessToken(token);
        socket.data.userId = claims.sub;
        socket.data.role = claims.role;
      }
    } catch { /* downgrade to anonymous */ }
    next();
  });

  io.on("connection", (socket) => {
    socket.join("board");
    if (socket.data.userId) {
      socket.join(`user:${socket.data.userId}`);
      socket.join(`role:${socket.data.role}`);
    }
    socket.on("disconnect", () => socket.removeAllListeners());
  });

  logger.info("socket.io initialised with redis adapter");
  return io;
}

const server = () => {
  if (!io) throw new Error("sockets not initialised");
  return io;
};

export const emitToRole = (role: string, event: string, payload: unknown) =>
  server().to(`role:${role}`).emit(event, payload);

export const emitToUsers = (userIds: string[], event: string, payload: unknown) => {
  if (userIds.length) server().to(userIds.map((id) => `user:${id}`)).emit(event, payload);
};

// Rooms only, never a global emit. Delta payloads, never the full dataset.
export function emitCollectionChanged(collection: string, roles: string[] = []): void {
  debounce(`coll:${collection}`, 150, () => {
    const s = server();
    s.to("board").emit("data:changed", { collection });
    for (const r of roles) s.to(`role:${r}`).emit("data:changed", { collection });
  });
}

export async function closeSockets(): Promise<void> {
  for (const t of pending.values()) clearTimeout(t);
  pending.clear();
  await new Promise<void>((resolve) => (io ? io.close(() => resolve()) : resolve()));
  io = null;
}