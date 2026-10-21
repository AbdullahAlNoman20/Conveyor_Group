// server/scripts/reset-password.ts
import "dotenv/config";
import postgres from "postgres";
import argon2 from "argon2";

/**
 * Sets a known password on one account, or lists the staff accounts.
 *
 * Needed because the seed uses ON CONFLICT DO NOTHING, so once an account
 * exists the seed can never repair its password — which is exactly the state
 * you land in after creating a staff member through the UI (random password,
 * shown once) and later trying the seed password.
 *
 *   npx tsx scripts/reset-password.ts --list
 *   npx tsx scripts/reset-password.ts accounts@conveyorgroup.com Demo@123
 *
 * Add --env-file=.env.render to target the deployed database.
 */
const [emailArg, passwordArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const listOnly = process.argv.includes("--list");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const useSsl = ["true", "1", "yes", "on"].includes(
  (process.env.DATABASE_SSL ?? "").trim().toLowerCase(),
);

const sql = postgres(url, {
  max: 1,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  prepare: false,
});

async function main(): Promise<void> {
  if (listOnly || !emailArg) {
    const rows = await sql`
      SELECT id, email, role, status, must_change_password
      FROM users WHERE role <> 'client' ORDER BY role, id
    `;

    console.log("\nStaff accounts\n");
    for (const r of rows) {
      console.log(
        `  ${String(r.id).padEnd(8)} ${String(r.email).padEnd(36)} ` +
          `${String(r.role).padEnd(12)} ${r.status}` +
          (r.must_change_password ? "  (must set password on first login)" : ""),
      );
    }

    if (!listOnly) {
      console.log("\nTo set a password:");
      console.log("  npx tsx scripts/reset-password.ts <email> <new-password>\n");
    }
    return;
  }

  if (!passwordArg) {
    console.error("Give a password too:  npx tsx scripts/reset-password.ts <email> <password>");
    process.exitCode = 1;
    return;
  }

  const email = emailArg.trim().toLowerCase();
  const [user] = await sql`SELECT id, email, role, status FROM users WHERE lower(email) = ${email}`;

  if (!user) {
    console.error(`\nNo account with that email: ${email}`);
    console.error("Run with --list to see the staff accounts.\n");
    process.exitCode = 1;
    return;
  }

  // Same parameters the server hashes with, so the stored hash is one the
  // login path can verify.
  const hash = await argon2.hash(passwordArg, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  await sql`
    UPDATE users
    SET password_hash = ${hash},
        status = 'active',
        must_change_password = false,
        updated_at = now()
    WHERE id = ${user.id}
  `;

  // Any live session still carries the old token; clearing them forces a
  // fresh sign in with the new password.
  await sql`UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = ${user.id} AND revoked_at IS NULL`;

  console.log(`\nPassword set for ${user.email} (${user.role}).`);
  console.log(`  Password: ${passwordArg}`);
  console.log("  The account is active and can log in now.\n");
}

main()
  .catch((err) => {
    console.error("\nFAILED:\n", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 }).catch(() => undefined);
    process.exit(process.exitCode ?? 0);
  });