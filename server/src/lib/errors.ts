// backend/src/lib/errors.ts
import { ERROR_CODES, type ErrorCode } from "./errorCodes.js";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: ErrorCode, statusCode = 400, details: Record<string, unknown> = {}, message?: string) {
    super(message ?? ERROR_CODES[code]);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return { success: false as const, error: { code: this.code, message: this.message, details: this.details } };
  }
}

export const badRequest  = (c: ErrorCode, d?: Record<string, unknown>) => new AppError(c, 400, d);
export const unauthorized = (c: ErrorCode = "UNAUTHENTICATED") => new AppError(c, 401);
export const forbidden    = (c: ErrorCode = "FORBIDDEN") => new AppError(c, 403);
export const notFound     = (c: ErrorCode = "NOT_FOUND") => new AppError(c, 404);
export const conflict     = (c: ErrorCode, d?: Record<string, unknown>) => new AppError(c, 409, d);