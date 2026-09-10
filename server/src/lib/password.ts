// server/src/lib/password.ts
import argon2 from "argon2";

// argon2 v0.45 no longer exports an `Options` type, so it is derived from the
// hash() signature instead. `argon2id` is declared as a plain `number` while
// HashOptions.type wants the literal union 0 | 1 | 2, hence the narrowing cast.
type HashOpts = NonNullable<Parameters<typeof argon2.hash>[1]>;

const OPTIONS: HashOpts = {
  type: argon2.argon2id as 2,
  memoryCost: 19456, // 19 MiB — OWASP minimum for argon2id
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, OPTIONS);
}

export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, OPTIONS);
}

export async function verifyPassword(hash: string | null, plain: string): Promise<boolean> {
  // Burn similar CPU when the user doesn't exist, to blunt enumeration timing.
  if (!hash) {
    await argon2.hash(plain, OPTIONS).catch(() => undefined);
    return false;
  }
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}