// backend/scripts/seed.ts
import { db, closeDb } from "../src/db/index.js";
import { clients, managers, mealLimits, menuItems, settings, users, weeklyMenu } from "../src/db/schema.js";
import { hashPassword } from "../src/lib/password.js";
import { genId } from "../src/lib/ids.js";
import { env } from "../src/config/env.js";
import { closeRedis } from "../src/lib/redis.js";
import { pingDb } from "../src/db/index.js";

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

  // Fail loudly and immediately if the DB isn't reachable, instead of dying
  // silently inside the transaction.
  if (!(await pingDb())) {
    throw new Error(
      `Cannot reach the database at ${env.DATABASE_URL}.\n` +
      `  - is it up?      docker compose ps\n` +
      `  - port mapped?   postgres must show 0.0.0.0:5432->5432/tcp\n` +
      `  - TLS mismatch?  local Postgres needs DATABASE_SSL=false`,
    );
  }
  console.log("db connection ok");

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

    await tx.insert(users).values([
      { id: "U-001", name: "Rafiq Ahmed", email: env.SEED_ADMIN_EMAIL, passwordHash, role: "super_admin", status: "active", department: "Administration", designation: "Super Administrator", avatarColor: "#000000" },
      { id: "U-002", name: "Nadia Islam", email: "manager@conveyorgroup.com", passwordHash, role: "manager", status: "active", department: "Restaurant Operations", designation: "Restaurant Manager", avatarColor: "#eb2a2d" },
      { id: "U-003", name: "Arif Hasan", email: "arif.manager@conveyorgroup.com", passwordHash, role: "manager", status: "active", department: "Restaurant Operations", designation: "Restaurant Manager", avatarColor: "#eb2a2d" },
      { id: "U-005", name: "Farzana Karim", email: "client@conveyorgroup.com", passwordHash, role: "client", status: "active", department: "Finance", designation: "Senior Accountant", employeeId: "EMP-1042", employmentType: "Company Employee", mealPlan: "Fixed Company Meal", mealBenefit: "Company Subsidized", avatarColor: "#059669" },
      { id: "U-006", name: "Tanvir Rahman", email: "tanvir.rahman@conveyorgroup.com", passwordHash, role: "client", status: "active", department: "Engineering", designation: "Software Engineer", employeeId: "EMP-1077", employmentType: "Company Employee", mealPlan: "Fixed Company Meal", mealBenefit: "Self Paid", avatarColor: "#059669" },
      { id: "U-007", name: "Sabrina Yasmin", email: "sabrina.yasmin@conveyorgroup.com", passwordHash, role: "client", status: "active", department: "HR", designation: "HR Executive", employeeId: "EMP-1103", employmentType: "Contractor", mealPlan: "Fixed Company Meal", mealBenefit: "Self Paid", avatarColor: "#059669" },
      { id: "U-008", name: "Imran Chowdhury", email: "imran.chowdhury@conveyorgroup.com", passwordHash, role: "client", status: "suspended", department: "Operations", designation: "Operations Lead", employeeId: "EMP-1155", employmentType: "Company Employee", mealPlan: "Fixed Company Meal", mealBenefit: "Complimentary", avatarColor: "#059669" },
    ]).onConflictDoNothing();

    await tx.insert(managers).values([
      { id: "MG-01", userId: "U-002", name: "Nadia Islam", email: "manager@conveyorgroup.com", status: "active" },
      { id: "MG-02", userId: "U-003", name: "Arif Hasan", email: "arif.manager@conveyorgroup.com", status: "active" },
    ]).onConflictDoNothing();

    // Every client row now has a real userId — the old seed only linked one by
    // NAME, which is what made the `clients[0]` fallback leak other profiles.
    await tx.insert(clients).values([
      { id: "C-001", userId: "U-005", name: "Farzana Karim", employeeId: "EMP-1042", email: "client@conveyorgroup.com", department: "Finance", designation: "Senior Accountant", employmentType: "Company Employee", mealBenefit: "Company Subsidized", qrStatus: "active", qrToken: genId("QR"), status: "active" },
      { id: "C-002", userId: "U-006", name: "Tanvir Rahman", employeeId: "EMP-1077", email: "tanvir.rahman@conveyorgroup.com", department: "Engineering", designation: "Software Engineer", employmentType: "Company Employee", mealBenefit: "Self Paid", qrStatus: "active", qrToken: genId("QR"), status: "active" },
      { id: "C-003", userId: "U-007", name: "Sabrina Yasmin", employeeId: "EMP-1103", email: "sabrina.yasmin@conveyorgroup.com", department: "HR", designation: "HR Executive", employmentType: "Contractor", mealBenefit: "Self Paid", qrStatus: "expired", qrToken: genId("QR"), status: "active" },
      { id: "C-004", userId: "U-008", name: "Imran Chowdhury", employeeId: "EMP-1155", email: "imran.chowdhury@conveyorgroup.com", department: "Operations", designation: "Operations Lead", employmentType: "Company Employee", mealBenefit: "Complimentary", qrStatus: "active", qrToken: genId("QR"), status: "suspended" },
    ]).onConflictDoNothing();
  });

  // console, not pino: pino-pretty runs in a worker thread that the exiting
  // process tears down before it flushes, which silently ate these lines.
  console.log("\nseed complete.");
  console.log(`  password for every seeded account: ${env.SEED_DEFAULT_PASSWORD}`);
  console.log("  superadmin@conveyorgroup.com  (Super Admin)");
  console.log("  manager@conveyorgroup.com     (Manager)");
  console.log("  client@conveyorgroup.com      (Client)\n");
}

main()
  .catch((err) => {
    console.error("\nSEED FAILED:\n", err instanceof Error ? err.message : err);
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb().catch(() => undefined);
    await closeRedis().catch(() => undefined);
  });