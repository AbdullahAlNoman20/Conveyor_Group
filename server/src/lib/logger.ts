// backend/src/lib/logger.ts
import { pino } from "pino";
import { env, isProd } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "*.password", "*.passwordHash", "*.password_hash",
      "*.refreshToken", "*.token", "*.qrToken", "*.qr_token",
    ],
    censor: "[REDACTED]",
  },
  // pino-pretty is a devDependency and isn't installed in production builds,
  // so the transport must only be wired up outside production.
  ...(isProd ? {} : { transport: { target: "pino-pretty", options: { colorize: true } } }),
});