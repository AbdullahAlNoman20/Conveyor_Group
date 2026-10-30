// server/src/storage/index.ts  (NEW)
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Transform, type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

/**
 * Files live on this server's disk, under STORAGE_DIR.
 *
 * Only the relative path is stored in the database. Pictures are shown
 * through short lived signed links served by /api/v1/files, so a file can
 * never be opened by guessing its name, and nothing in the folder is public.
 */

export type AssetKind = "avatars" | "menu-items" | "documents" | "vouchers";

export interface UploadResult {
  path: string;
  url: string | null;
  bytes: number;
  mime: string;
}

interface FileType {
  mime: string;
  ext: string;
  test: (b: Buffer) => boolean;
}

const JPEG: FileType = { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff };
const PNG: FileType = {
  mime: "image/png",
  ext: "png",
  test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
};
const WEBP: FileType = {
  mime: "image/webp",
  ext: "webp",
  test: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
};
const GIF: FileType = {
  mime: "image/gif",
  ext: "gif",
  test: (b) => ["GIF87a", "GIF89a"].includes(b.toString("ascii", 0, 6)),
};
const PDF: FileType = { mime: "application/pdf", ext: "pdf", test: (b) => b.toString("ascii", 0, 5) === "%PDF-" };

const MB = 1024 * 1024;
const RULES: Record<AssetKind, { maxBytes: number; types: FileType[] }> = {
  avatars: { maxBytes: 5 * MB, types: [JPEG, PNG, WEBP] },
  "menu-items": { maxBytes: 5 * MB, types: [JPEG, PNG, WEBP] },
  documents: { maxBytes: 10 * MB, types: [JPEG, PNG, WEBP, PDF] },
  vouchers: { maxBytes: 10 * MB, types: [JPEG, PNG, WEBP, GIF, PDF] },
};

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", pdf: "application/pdf",
};

// Exactly the shape this module writes. Anything else is refused, which also
// rules out "../" tricks.
const PATH_RE = /^(avatars|menu-items|documents|vouchers)\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(jpg|png|webp|gif|pdf)$/;

const ROOT = path.resolve(env.STORAGE_DIR);
const TMP_DIR = path.join(ROOT, ".tmp");
const TRASH_DIR = path.join(ROOT, ".trash");

const fail = (status: number, message: string) => new AppError("VALIDATION_ERROR", status, {}, message);

export const isValidAssetPath = (p: unknown): p is string => typeof p === "string" && PATH_RE.test(p);

function absolute(rel: string): string {
  const full = path.resolve(ROOT, rel);
  if (!full.startsWith(ROOT + path.sep)) throw fail(400, "Bad file path.");
  return full;
}

/* ── upload ─────────────────────────────────────────────────────────── */

export async function uploadAsset(opts: {
  kind: AssetKind | string;
  stream: Readable;
  ownerEntity?: string;
  ownerId?: string | null;
}): Promise<UploadResult> {
  const kind = opts.kind as AssetKind;
  const rule = RULES[kind];
  if (!rule) throw fail(400, "Unknown upload type.");

  await mkdir(TMP_DIR, { recursive: true, mode: 0o750 });
  const tmpFile = path.join(TMP_DIR, randomBytes(16).toString("hex"));

  let bytes = 0;
  let head = Buffer.alloc(0);

  // Counts and sniffs while streaming, so a huge file is cut off early
  // instead of filling the disk first.
  const guard = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      bytes += chunk.length;
      if (bytes > rule.maxBytes) {
        cb(fail(413, `File is too big. Keep it under ${Math.round(rule.maxBytes / MB)} MB.`));
        return;
      }
      if (head.length < 16) head = Buffer.concat([head, chunk.subarray(0, 16 - head.length)]);
      cb(null, chunk);
    },
  });

  try {
    await pipeline(opts.stream, guard, createWriteStream(tmpFile, { mode: 0o640, flags: "wx" }));

    if ((opts.stream as Readable & { truncated?: boolean }).truncated) {
      throw fail(413, `File is too big. Keep it under ${Math.round(rule.maxBytes / MB)} MB.`);
    }
    if (bytes === 0) throw fail(422, "The file is empty.");

    // The real content decides the type, never the name or the browser's claim.
    const type = rule.types.find((t) => t.test(head));
    if (!type) {
      throw fail(
        415,
        rule.types.some((t) => t.ext === "pdf")
          ? "Only JPG, PNG, WEBP or PDF files are allowed."
          : "Only JPG, PNG or WEBP pictures are allowed.",
      );
    }

    const now = new Date();
    const y = String(now.getFullYear());
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const rel = `${kind}/${y}/${m}/${randomBytes(16).toString("hex")}.${type.ext}`;

    await mkdir(path.dirname(absolute(rel)), { recursive: true, mode: 0o750 });
    await rename(tmpFile, absolute(rel));

    return { path: rel, url: await signedUrl(rel), bytes, mime: type.mime };
  } catch (err) {
    await rm(tmpFile, { force: true }).catch(() => undefined);
    throw err;
  }
}

/* ── signed links ───────────────────────────────────────────────────── */

const HOUR = 3600;

function signature(rel: string, exp: number): string {
  return createHmac("sha256", env.FILE_URL_SECRET).update(`${rel}:${exp}`).digest("base64url").slice(0, 32);
}

/**
 * Link valid for one to two hours. Rounded to the hour, so the same picture
 * keeps the same link for a while and the browser can cache it.
 */
export async function signedUrl(rel: string | null | undefined): Promise<string | null> {
  if (!isValidAssetPath(rel)) return null;
  const exp = (Math.floor(Date.now() / 1000 / HOUR) + 2) * HOUR;
  const base = env.FILES_BASE_URL.replace(/\/+$/, "");
  return `${base}/${rel}?e=${exp}&s=${signature(rel, exp)}`;
}

export async function signedUrlMany(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const p of new Set(paths)) {
    if (!p) continue;
    const url = await signedUrl(p);
    if (url) out.set(p, url);
  }
  return out;
}

export function verifySignedPath(rel: string, e: unknown, s: unknown): boolean {
  if (!isValidAssetPath(rel) || typeof e !== "string" || typeof s !== "string") return false;
  const exp = Number(e);
  if (!Number.isInteger(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(signature(rel, exp));
  const given = Buffer.from(s);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function openAsset(rel: string) {
  if (!isValidAssetPath(rel)) return null;
  const full = absolute(rel);
  try {
    const info = await stat(full);
    if (!info.isFile()) return null;
    const ext = rel.split(".").pop() ?? "";
    return { stream: createReadStream(full), size: info.size, mime: MIME_BY_EXT[ext] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

/* ── removal ────────────────────────────────────────────────────────── */

/**
 * A replaced or deleted file goes to .trash instead of being erased, so a
 * mistake can still be undone. The nightly backup script empties anything
 * older than 30 days.
 */
export async function markOrphan(rel: string | null | undefined): Promise<void> {
  if (!isValidAssetPath(rel)) return;
  const day = new Date().toISOString().slice(0, 10);
  const target = path.join(TRASH_DIR, day, rel.replace(/\//g, "_"));
  try {
    await mkdir(path.dirname(target), { recursive: true, mode: 0o750 });
    await rename(absolute(rel), target);
  } catch {
    /* already gone */
  }
}

export const deleteAsset = markOrphan;



/**
 * Removes a file for good, from its place or from .trash.
 * Kept for the nightly cleanup job, which calls it by this name.
 */
export async function hardDelete(rels: string | string[] | null | undefined): Promise<void> {
  const list = Array.isArray(rels) ? rels : rels ? [rels] : [];
  for (const rel of list) {
    if (!isValidAssetPath(rel)) continue;
    await rm(absolute(rel), { force: true }).catch(() => undefined);
  }
}