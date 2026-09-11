// backend/src/app.ts
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import compress from "@fastify/compress";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { ZodError } from "zod";
import { randomUUID } from "node:crypto";
import { ALLOWED_ORIGINS, env, isProd } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { redis } from "./lib/redis.js";
import { AppError } from "./lib/errors.js";
import { csrfGuard } from "./middleware/csrf.js";
import registerRoutes from "./routes/index.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    // pino satisfies FastifyBaseLogger at runtime, but pino v10's own Logger
    // type is narrower (msgPrefix), which would pin the whole FastifyInstance
    // generic and break every route registration. Widening here keeps `app`
    // as a plain FastifyInstance everywhere else.
    loggerInstance: logger as unknown as FastifyBaseLogger,
    trustProxy: true,
    genReqId: () => randomUUID(), // request-ID correlation in every log line
    bodyLimit: 1024 * 1024,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", new URL(env.SUPABASE_URL).origin],
        connectSrc: ["'self'", ...ALLOWED_ORIGINS, "ws:", "wss:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: isProd ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
    crossOriginResourcePolicy: { policy: "same-site" },
    referrerPolicy: { policy: "no-referrer" },
  });

  await app.register(cors, {
    // Explicit allow-list, never "*" — credentials mode forbids the wildcard.
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin.replace(/\/$/, ""))) {
        cb(null, true);
        return;
      }
      cb(new Error("Origin not allowed"), false);
    },
    credentials: true,
    allowedHeaders: ["content-type", "x-csrf-token"],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });

  await app.register(cookie);
  await app.register(compress, { global: true, encodings: ["br", "gzip"], threshold: 1024 });

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
    redis,
    keyGenerator: (req) => `${req.ip}:${req.routeOptions?.url ?? req.url}`,
    errorResponseBuilder: () => new AppError("RATE_LIMITED", 429).toJSON(),
  });

  await app.register(multipart, { limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1, fields: 10 } });

  if (env.ENABLE_SWAGGER) {
    await app.register(swagger, {
      openapi: {
        info: { title: "CCCMS API", version: "1.0.0" },
        servers: [{ url: "/" }],
      },
    });
    await app.register(swaggerUi, { routePrefix: "/docs" });
  }

  // CSRF on every state-changing request. Runs after cookie parsing.
  app.addHook("preHandler", csrfGuard);

  app.setNotFoundHandler((_req, reply) => reply.code(404).send(new AppError("NOT_FOUND", 404).toJSON()));

  // One bad request never takes the process down, and no stack trace or
  // driver error string ever reaches the client.
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      req.log.warn({ code: err.code, path: req.url }, "handled app error");
      return reply.code(err.statusCode).send(err.toJSON());
    }
    if (err instanceof ZodError) {
      // zod v4: issue.path entries can be symbols, so coerce before joining.
      const details: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = issue.path.map(String).join(".") || "_";
        details[key] = issue.message;
      }
      return reply.code(422).send(new AppError("VALIDATION_ERROR", 422, details).toJSON());
    }
    if ((err as { statusCode?: number }).statusCode === 429) {
      return reply.code(429).send(new AppError("RATE_LIMITED", 429).toJSON());
    }
    if ((err as { code?: string }).code === "FST_REQ_FILE_TOO_LARGE") {
      return reply.code(413).send(new AppError("FILE_TOO_LARGE", 413).toJSON());
    }
    req.log.error({ err, path: req.url }, "unhandled error");
    return reply.code(500).send(new AppError("INTERNAL_ERROR", 500).toJSON());
  });

  await registerRoutes(app);
  return app;
}