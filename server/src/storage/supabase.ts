// backend/src/storage/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import type { Readable } from "node:stream";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { AppError } from "../lib/errors.js";
import { db } from "../db/index.js";
import { storageObjects } from "../db/schema.js";
import { randomToken } from "../lib/ids.js";

const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_DOC = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export type AssetKind = "avatars" | "menu-items" | "documents";

let client: SupabaseClient | null = null;
const sb = () => (client ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
}));

// Circuit breaker: a storage outage must never take down the order flow.
let failures = 0;
let openedAt = 0;
const THRESHOLD = 5;
const COOLDOWN_MS = 30_000;

function assertClosed(): void {
  if (failures >= THRESHOLD && Date.now() - openedAt < COOLDOWN_MS) throw new AppError("STORAGE_UNAVAILABLE", 503);
  if (failures >= THRESHOLD) failures = 0; // half-open probe
}
function trip(err: unknown): void {
  failures += 1;
  if (failures === THRESHOLD) openedAt = Date.now();
  logger.error({ err, failures }, "supabase storage failure");
}

async function streamToBuffer(stream: Readable, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    total += (chunk as Buffer).length;
    if (total > maxBytes) throw new AppError("FILE_TOO_LARGE", 413);
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export interface UploadResult { path: string; bytes: number; mime: string }

// Validated by MAGIC BYTES (never the client's MIME), EXIF stripped, re-encoded.
export async function uploadAsset(opts: {
  kind: AssetKind; stream: Readable; ownerEntity?: string; ownerId?: string;
}): Promise<UploadResult> {
  assertClosed();

  const raw = await streamToBuffer(opts.stream, env.MAX_UPLOAD_BYTES);
  // file-type v22 types the arg as Uint8Array; Buffer is one, but the view
  // keeps TS happy without a cast.
  const detected = await fileTypeFromBuffer(new Uint8Array(raw));
  const allowed = opts.kind === "documents" ? ALLOWED_DOC : ALLOWED_IMAGE;
  if (!detected || !allowed.has(detected.mime)) throw new AppError("UNSUPPORTED_FILE_TYPE", 415);

  let body = raw;
  let mime = detected.mime;
  let ext = detected.ext as string;

  if (detected.mime !== "application/pdf") {
    // rotate() applies EXIF orientation then drops all metadata (privacy).
    body = await sharp(raw, { failOn: "error" })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    mime = "image/webp";
    ext = "webp";
  }

  const path = `${opts.kind}/${new Date().toISOString().slice(0, 7)}/${randomToken(16)}.${ext}`;

  try {
    const { error } = await sb().storage.from(env.SUPABASE_BUCKET)
      .upload(path, body, { contentType: mime, cacheControl: "3600", upsert: false });
    if (error) throw error;
    failures = 0;
  } catch (err) {
    trip(err);
    throw new AppError("UPLOAD_FAILED", 502);
  }

  await db.insert(storageObjects).values({
    path, bucket: env.SUPABASE_BUCKET,
    ownerEntity: opts.ownerEntity ?? null, ownerId: opts.ownerId ?? null,
  }).onConflictDoNothing();

  return { path, bytes: body.byteLength, mime };
}

export async function signedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  try {
    assertClosed();
    const { data, error } = await sb().storage.from(env.SUPABASE_BUCKET)
      .createSignedUrl(path, env.SIGNED_URL_TTL_SECONDS);
    if (error) throw error;
    failures = 0;
    return data?.signedUrl ?? null;
  } catch (err) {
    trip(err);
    return null; // degrade to the generated placeholder avatar
  }
}

export async function signedUrlMany(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean) as string[])];
  const out = new Map<string, string>();
  if (!unique.length) return out;
  try {
    assertClosed();
    const { data, error } = await sb().storage.from(env.SUPABASE_BUCKET)
      .createSignedUrls(unique, env.SIGNED_URL_TTL_SECONDS);
    if (error) throw error;
    for (const row of data ?? []) if (row.path && row.signedUrl) out.set(row.path, row.signedUrl);
    failures = 0;
  } catch (err) { trip(err); }
  return out;
}

export async function markOrphan(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await db.update(storageObjects).set({ orphanedAt: new Date() })
    .where(eq(storageObjects.path, path)).catch(() => undefined);
}

export async function hardDelete(paths: string[]): Promise<void> {
  if (!paths.length) return;
  assertClosed();
  const { error } = await sb().storage.from(env.SUPABASE_BUCKET).remove(paths);
  if (error) { trip(error); throw new AppError("STORAGE_UNAVAILABLE", 503); }
}