// backend/scripts/seed.ts
import { closeDb, db, pingDb, sqlClient as sqlRaw } from "../src/db/index.js";
import { eq, sql } from "drizzle-orm";
import { clients, managers, mealLimits, menuItems, settings, users, weeklyMenu } from "../src/db/schema.js";
import { hashPassword } from "../src/lib/password.js";
import { genId } from "../src/lib/ids.js";
import { env } from "../src/config/env.js";
import { closeRedis } from "../src/lib/redis.js";

const MENU = [
  { id: "M-001", name: "Khichuri with Egg", category: "Fixed Meal", price: 90, spiceLevel: "Mild", calories: 420, allergens: ["Egg"], description: "A warming one-pot blend of rice and lentils, slow-cooked with turmeric and cumin, finished with a boiled egg on the side." },
  { id: "M-002", name: "Fish Curry with Rice", category: "Fixed Meal", price: 120, spiceLevel: "Medium", calories: 480, allergens: ["Fish"], description: "River fish cooked in a light turmeric-forward curry, served with steamed rice and a wedge of lime." },
  { id: "M-003", name: "Chicken Curry with Rice", category: "Fixed Meal", price: 130, spiceLevel: "Medium-Hot", calories: 520, allergens: [], description: "Bone-in chicken slow-cooked in a rich onion-tomato masala." },
  { id: "M-004", name: "Beef Curry with Rice", category: "Fixed Meal", price: 150, spiceLevel: "Hot", calories: 560, allergens: [], description: "Slow-braised beef in a deep, dark bhuna-style curry." },
  { id: "M-005", name: "Mixed Vegetable with Rice", category: "Fixed Meal", price: 80, spiceLevel: "Mild", calories: 340, allergens: [], description: "Seasonal vegetables tempered with panch phoron, served with steamed rice." },
  // These two are referenced by weekly-menu.json but were missing from menu.json,
  // which left the Weekly Planner showing a broken image and a Tk 0 price.
  { id: "M-013", name: "Egg Curry with Rice", category: "Fixed Meal", price: 85, spiceLevel: "Mild", calories: 400, allergens: ["Egg"], description: "Boiled eggs simmered in a light onion gravy, served with rice." },
  { id: "M-014", name: "Special Menu", category: "Fixed Meal", price: 160, spiceLevel: "Medium", calories: 600, allergens: [], description: "Friday's rotating chef's special." },
  // Display-only categories: shown on the public Home page, not orderable.
  { id: "M-006", name: "Grilled Sandwich", category: "Custom Menu", price: 110, spiceLevel: "Mild", calories: 380, allergens: ["Dairy", "Gluten"], description: "Toasted bread layered with vegetables, cheese, and a smoky sauce." },
  { id: "M-007", name: "Chicken Fried Rice", category: "Custom Menu", price: 140, spiceLevel: "Mild", calories: 540, allergens: ["Egg"], description: "Wok-tossed rice with chicken, egg, and vegetables." },
  { id: "M-008", name: "Coffee", category: "Beverage", price: 60, spiceLevel: "-", calories: 5, allergens: [], description: "Freshly brewed, served hot." },
  { id: "M-009", name: "Fresh Lime Water", category: "Beverage", price: 30, spiceLevel: "-", calories: 60, allergens: [], description: "Lime, a touch of salt and sugar, ice-cold." },
  { id: "M-010", name: "Vegetable Samosa", category: "Evening Snack", price: 25, spiceLevel: "Medium", calories: 150, allergens: ["Gluten"], description: "Crisp pastry parcels filled with spiced potato and peas." },
  { id: "M-011", name: "Singara", category: "Evening Snack", price: 20, spiceLevel: "Medium", calories: 140, allergens: ["Gluten"], description: "Bengal's take on the samosa — smaller, spicier." },
  { id: "M-012", name: "Beef Roll", category: "Evening Snack", price: 70, spiceLevel: "Medium-Hot", calories: 320, allergens: ["Gluten"], description: "Spiced minced beef wrapped in a flaky paratha roll." },
];

const WEEK = [
  { day: "Saturday", meal: "Khichuri with Egg" },
  { day: "Sunday", meal: "Egg Curry with Rice" },
  { day: "Monday", meal: "Fish Curry with Rice" },
  { day: "Tuesday", meal: "Chicken Curry with Rice" },
  { day: "Wednesday", meal: "Beef Curry with Rice" },
  { day: "Thursday", meal: "Mixed Vegetable with Rice" },
  { day: "Friday", meal: "Special Menu" },
];

async function main(): Promise<void> {
  // Guarded rather than banned: a fresh deploy needs one seeded Super Admin to
  // log in with at all. ALLOW_PROD_SEED is set for that single run, then removed.
  if (env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    throw new Error(
      "Refusing to seed a production database. Set ALLOW_PROD_SEED=true for a one-off first seed.",
    );
  }

  // Reachability first: every check below needs a working connection, and a
  // connection failure disguised as a schema failure sends you looking in the
  // wrong place.
  if (!(await pingDb())) {
    throw new Error(
      `Cannot reach the database at ${env.DATABASE_URL}.\n` +
      `  - is it up?      docker compose ps\n` +
      `  - port mapped?   postgres must show 0.0.0.0:5432->5432/tcp\n` +
      `  - TLS mismatch?  local Postgres needs DATABASE_SSL=false`,
    );
  }
  console.log("db connection ok");

  // The seed inserts an `accounts` user, which the role CHECK constraint only
  // accepts after migration 0005. Catching it here beats a rolled-back
  // transaction that looks like nothing was seeded at all.
  //
  // The generic is the ROW ARRAY type, not a single row — postgres-js always
  // resolves to a list.
  const [chk] = await sqlRaw<{ def: string }[]>`
    SELECT pg_get_constraintdef(oid) AS def
    FROM pg_constraint WHERE conname = 'users_role_chk'
  `;
  if (chk && !chk.def.includes("accounts")) {
    throw new Error(
      "The database is behind: the users role constraint doesn't allow 'accounts' yet.\n" +
        "  Run the migrations first:  npm run db:deploy",
    );
  }

  // Seeded demo accounts get a known working password, not a forced-reset
  // placeholder — the column default handles mustChangePassword = false.
  const passwordHash = await hashPassword(env.SEED_DEFAULT_PASSWORD);
  const today = new Date().toISOString().slice(0, 10);
  const byName = new Map(MENU.map((m) => [m.name, m.id]));

  await db.transaction(async (tx) => {
    await tx.insert(settings)
      .values({ id: 1, selfOrderStationCode: env.SELF_ORDER_STATION_CODE })
      .onConflictDoNothing();

    await tx.insert(mealLimits)
      .values({ date: today, dailyLimit: env.DEFAULT_DAILY_MEAL_LIMIT, served: 0 })
      .onConflictDoNothing();

    await tx.insert(menuItems).values(MENU.map((m) => ({
      id: m.id, name: m.name, category: m.category, price: String(m.price),
      available: true, description: m.description, spiceLevel: m.spiceLevel,
      calories: m.calories, allergens: m.allergens,
    }))).onConflictDoNothing();

    await tx.insert(weeklyMenu).values(WEEK.map((w) => ({
      day: w.day, mealName: w.meal, menuItemId: byName.get(w.meal) ?? null,
    }))).onConflictDoNothing();

    const USERS = [
      { id: "U-001", name: "Rafiq Ahmed", email: env.SEED_ADMIN_EMAIL, passwordHash, role: "super_admin", status: "active", department: "Administration", designation: "Super Administrator", avatarColor: "#000000" },
      { id: "U-002", name: "Nadia Islam", email: "manager@conveyorgroup.com", passwordHash, role: "manager", status: "active", department: "Restaurant Operations", designation: "Restaurant Manager", avatarColor: "#eb2a2d" },
      { id: "U-003", name: "Arif Hasan", email: "arif.manager@conveyorgroup.com", passwordHash, role: "manager", status: "active", department: "Restaurant Operations", designation: "Restaurant Manager", avatarColor: "#eb2a2d" },
      // Accounts runs the market buying, the store room and the cost reports.
      { id: "U-004", name: "Shirin Akter", email: "accounts@conveyorgroup.com", passwordHash, role: "accounts", status: "active", department: "Accounts", designation: "Accounts Officer", avatarColor: "#0284c7" },
      { id: "U-005", name: "Farzana Karim", email: "client@conveyorgroup.com", passwordHash, role: "client", status: "active", department: "Finance", designation: "Senior Accountant", employeeId: "EMP-1042", employmentType: "Company Employee", mealPlan: "Fixed Company Meal", mealBenefit: "Company Subsidized", avatarColor: "#059669" },
      { id: "U-006", name: "Tanvir Rahman", email: "tanvir.rahman@conveyorgroup.com", passwordHash, role: "client", status: "active", department: "Engineering", designation: "Software Engineer", employeeId: "EMP-1077", employmentType: "Company Employee", mealPlan: "Fixed Company Meal", mealBenefit: "Self Paid", avatarColor: "#059669" },
      { id: "U-007", name: "Sabrina Yasmin", email: "sabrina.yasmin@conveyorgroup.com", passwordHash, role: "client", status: "active", department: "HR", designation: "HR Executive", employeeId: "EMP-1103", employmentType: "Contractor", mealPlan: "Fixed Company Meal", mealBenefit: "Self Paid", avatarColor: "#059669" },
      { id: "U-008", name: "Imran Chowdhury", email: "imran.chowdhury@conveyorgroup.com", passwordHash, role: "client", status: "suspended", department: "Operations", designation: "Operations Lead", employeeId: "EMP-1155", employmentType: "Company Employee", mealPlan: "Fixed Company Meal", mealBenefit: "Complimentary", avatarColor: "#059669" },
    ];

    /**
     * Email is the real identity here, not the id.
     *
     * An account created through the UI gets the next sequential id, so by the
     * time the seed runs, `accounts@conveyorgroup.com` may already exist as
     * U-010. The insert below is then skipped on the unique-email conflict,
     * U-004 never appears, and every client row pointing at U-004 fails its
     * foreign key. Reading the id back after each insert keeps the two in step
     * whatever the database already holds.
     */
    const userIdByEmail = new Map<string, string>();

    // One row per statement, so a rejected row names itself instead of taking
    // the whole batch down with an error that only quotes the combined SQL.
    for (const row of USERS) {
      try {
        await tx.insert(users).values(row).onConflictDoNothing();
      } catch (err) {
        throw new Error(
          `Could not seed user ${row.id} (${row.email}, role ${row.role}).`,
          { cause: err },
        );
      }

      const existing = await tx.query.users.findFirst({
        where: sql`lower(${users.email}) = ${row.email.toLowerCase()}`,
      });

      if (!existing) {
        throw new Error(`User ${row.email} could not be created or found.`);
      }

      userIdByEmail.set(row.email.toLowerCase(), existing.id);

      if (existing.id !== row.id) {
        console.log(
          `  note: ${row.email} already existed as ${existing.id}, not ${row.id}`,
        );
      }
    }

    // Legacy mirror of the staff logins. Kept only so older rows keep their
    // foreign keys; the app reads staff from `users` now. Resolved by email
    // for the same reason as the client rows above.
    const MANAGER_MIRROR = [
      { id: "MG-01", email: "manager@conveyorgroup.com", name: "Nadia Islam" },
      { id: "MG-02", email: "arif.manager@conveyorgroup.com", name: "Arif Hasan" },
    ];

    for (const row of MANAGER_MIRROR) {
      const userId = userIdByEmail.get(row.email);
      if (!userId) continue;
      await tx.insert(managers)
        .values({ id: row.id, userId, name: row.name, email: row.email, status: "active" })
        .onConflictDoNothing();
    }

    // Every client row has a real userId — the old seed linked one by NAME,
    // which is what made the `clients[0]` fallback leak other profiles.
    //
    // Staff get a client row too, because they eat the daily meal like anyone
    // else. Their meal is on the company, so the benefit is Complimentary.
    const CLIENTS = [
      { id: "C-900", userId: "U-002", name: "Nadia Islam", employeeId: "STF-U002", email: "manager@conveyorgroup.com", department: "Restaurant Operations", designation: "Restaurant Manager", employmentType: "Company Employee", mealBenefit: "Complimentary", qrStatus: "active", qrToken: genId("QR"), status: "active" },
      { id: "C-901", userId: "U-003", name: "Arif Hasan", employeeId: "STF-U003", email: "arif.manager@conveyorgroup.com", department: "Restaurant Operations", designation: "Restaurant Manager", employmentType: "Company Employee", mealBenefit: "Complimentary", qrStatus: "active", qrToken: genId("QR"), status: "active" },
      { id: "C-902", userId: "U-004", name: "Shirin Akter", employeeId: "STF-U004", email: "accounts@conveyorgroup.com", department: "Accounts", designation: "Accounts Officer", employmentType: "Company Employee", mealBenefit: "Complimentary", qrStatus: "active", qrToken: genId("QR"), status: "active" },

      { id: "C-001", userId: "U-005", name: "Farzana Karim", employeeId: "EMP-1042", email: "client@conveyorgroup.com", department: "Finance", designation: "Senior Accountant", employmentType: "Company Employee", mealBenefit: "Company Subsidized", qrStatus: "active", qrToken: genId("QR"), status: "active" },
      { id: "C-002", userId: "U-006", name: "Tanvir Rahman", employeeId: "EMP-1077", email: "tanvir.rahman@conveyorgroup.com", department: "Engineering", designation: "Software Engineer", employmentType: "Company Employee", mealBenefit: "Self Paid", qrStatus: "active", qrToken: genId("QR"), status: "active" },
      { id: "C-003", userId: "U-007", name: "Sabrina Yasmin", employeeId: "EMP-1103", email: "sabrina.yasmin@conveyorgroup.com", department: "HR", designation: "HR Executive", employmentType: "Contractor", mealBenefit: "Self Paid", qrStatus: "expired", qrToken: genId("QR"), status: "active" },
      { id: "C-004", userId: "U-008", name: "Imran Chowdhury", employeeId: "EMP-1155", email: "imran.chowdhury@conveyorgroup.com", department: "Operations", designation: "Operations Lead", employmentType: "Company Employee", mealBenefit: "Complimentary", qrStatus: "active", qrToken: genId("QR"), status: "suspended" },
    ];

    for (const row of CLIENTS) {
      // The owning user may live under a different id than the one written
      // above, so resolve it by email rather than trusting the literal.
      const userId = userIdByEmail.get(row.email.toLowerCase());
      if (!userId) {
        console.log(`  skipped client ${row.name}: no user for ${row.email}`);
        continue;
      }

      // Migration 0006 may already have built the staff meal rows with
      // generated ids, so match by user rather than by id — otherwise the same
      // person would be seeded twice under two different client ids.
      const existing = await tx.query.clients.findFirst({
        where: eq(clients.userId, userId),
      });
      if (existing) continue;

      try {
        await tx.insert(clients).values({ ...row, userId }).onConflictDoNothing();
      } catch (err) {
        throw new Error(
          `Could not seed client ${row.id} (${row.name}, employee id ${row.employeeId}).`,
          { cause: err },
        );
      }
    }
  });

  // console, not pino: pino-pretty runs in a worker thread that the exiting
  // process tears down before it flushes, which silently ate these lines.
  console.log("\nseed complete.");
  console.log(`  password for every seeded account: ${env.SEED_DEFAULT_PASSWORD}`);
  console.log("  superadmin@conveyorgroup.com  (Super Admin)");
  console.log("  manager@conveyorgroup.com     (Manager)");
  console.log("  accounts@conveyorgroup.com    (Accounts)");
  console.log("  client@conveyorgroup.com      (Client)\n");
}

main()
  .catch((err) => {
    // Drizzle wraps the driver error, and its own message is the full SQL with
    // every parameter — which buries the one line that says what Postgres
    // actually objected to. Unwrap the chain and lead with that.
    const chain: unknown[] = [];
    let current: unknown = err;
    while (current) {
      chain.push(current);
      current = (current as { cause?: unknown }).cause;
    }

    const root = chain[chain.length - 1] as
      | { message?: string; detail?: string; constraint_name?: string; table_name?: string; column_name?: string }
      | undefined;

    console.error("\nSEED FAILED");

    if (root?.message) console.error(`\n  ${root.message}`);
    if (root?.detail) console.error(`  ${root.detail}`);
    if (root?.constraint_name) console.error(`  constraint: ${root.constraint_name}`);
    if (root?.table_name) console.error(`  table: ${root.table_name}`);
    if (root?.column_name) console.error(`  column: ${root.column_name}`);

    console.error("");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb().catch(() => undefined);
    await closeRedis().catch(() => undefined);
    // The Redis client keeps a reconnect timer alive, which would hang the
    // process when seeding a remote database from a machine with no Redis.
    process.exit(process.exitCode ?? 0);
  });