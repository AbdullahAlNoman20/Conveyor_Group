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
  transport: isProd ? undefined : { target: "pino-pretty", options: { colorize: true } },
});