// backend/src/schemas/index.ts
import { z } from "zod";
import { ENUMS } from "../db/schema.js";

const text = (max: number) => z.string().trim().max(max);
const reqText = (max: number) => text(max).min(1);
const email = z.email().trim().toLowerCase().max(254);
// Eight characters with a mix of cases and a digit. Short enough that people
// pick something they can actually remember rather than writing it down.
const strongPassword = z.string().min(8).max(128)
  .regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/);

/* auth */
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: strongPassword,
});

// No current password: the temporary one is the user's own email address.
export const initialPasswordSchema = z.object({ newPassword: strongPassword });

/* clients */
const clientBase = z.object({
  name: reqText(100),
  employeeId: reqText(30),
  email: email.optional().or(z.literal("")),
  phone: text(20).optional(),
  department: reqText(60),
  designation: text(60).optional(),
  employmentType: z.enum(ENUMS.EMPLOYMENT_TYPES).default("Company Employee"),
  mealBenefit: z.enum(ENUMS.MEAL_BENEFITS).default("Self Paid"),
  photoPath: text(255).optional(),
  supportingDocumentPath: text(255).optional(),
  supportingDocumentName: text(255).optional(),
});

export const createClientSchema = clientBase.refine(
  (v) => v.mealBenefit !== "Complimentary" || !!v.supportingDocumentPath,
  { path: ["supportingDocumentPath"], message: "A supporting document is required for Complimentary meal benefit." },
);
// FIX: .partial() on the BASE object — ZodEffects has no .innerType().
export const updateClientSchema = clientBase.partial();

/**
 * Self-service profile edit. The name is deliberately NOT accepted: it appears
 * on the printed QR card, the token board and every payroll report, so it is
 * changed by a Super Admin or not at all.
 */
export const updateOwnProfileSchema = z.object({
  photoPath: text(255).optional(),
});

/**
 * Bulk import. Rows are parsed from the spreadsheet in the browser and sent as
 * JSON; every row is re-validated here because a client-side parse is only a
 * convenience, never a trust boundary.
 */
export const bulkImportSchema = z.object({
  rows: z
    .array(
      z.object({
        // Preserved so failures can be reported against the user's own row
        // numbering rather than an index into a filtered array.
        rowNumber: z.coerce.number().int().min(1),
        name: text(100),
        employeeId: text(30),
        email: text(254),
        phone: text(20).optional(),
        department: text(60),
        designation: text(60).optional(),
        // Meal plan is not accepted at all: imported employees are always on
        // the fixed company meal, so there is nothing for a caller to choose.
        mealBenefit: text(40).optional(),
      }),
    )
    .min(1)
    .max(500),
});

export const clientListQuery = z.object({
  q: text(80).optional(),
  status: z.enum(["active", "suspended", "archived", "all"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(100),
});

export const clientActionSchema = z.object({
  action: z.enum(["suspend", "activate", "archive", "restore", "reset-password", "reissue-qr", "expire-qr"]),
});

/* staff */
export const createStaffSchema = z.object({
  name: reqText(100),
  email,
  phone: text(20).optional(),
  department: text(60).default("Restaurant Operations"),
  designation: text(60).default("Restaurant Manager"),
  status: z.enum(["active", "inactive"]).default("active"),
  // Accounts owns kitchen procurement; Manager runs the counter.
  role: z.enum(["manager", "accounts"]).default("manager"),
});

/* menu */
export const menuItemSchema = z.object({
  name: reqText(100),
  category: z.enum(ENUMS.MENU_CATEGORIES),
  price: z.coerce.number().positive().max(1_000_000),
  spiceLevel: text(20).optional(),
  description: text(500).optional(),
  calories: z.coerce.number().int().min(0).max(10_000).optional(),
  allergens: z.array(text(40)).max(20).optional(),
  imagePath: text(255).optional(),
  imageName: text(255).optional(),
  available: z.boolean().default(true),
});
export const menuItemPatchSchema = menuItemSchema.partial();

// One entry per day. A day can be left empty ("No meal"), and the dish is
// picked by id so renaming it later does not break the plan.
export const weeklyMenuSchema = z.object({
  days: z
    .array(
      z.object({
        day: z.enum(ENUMS.DAYS),
        menuItemId: text(40).optional(),
        meal: text(100).optional(),
      }),
    )
    .length(7)
    .refine((d) => new Set(d.map((x) => x.day)).size === 7, { message: "Each day must appear once." }),
});

/**
 * Placing an order takes no input at all: the dish comes from the weekly
 * planner, the price from the menu row, and the client from the session. There
 * is nothing a caller could send that the server would trust.
 */
export const placeOrderSchema = z.object({}).optional();

export const instantOrderSchema = z.object({
  source: z.enum(["self_scan", "manager_scan"]),
  stationCode: text(120).optional(),
  clientId: text(40).optional(),
});

export const orderListQuery = z.object({
  status: text(200).optional(),
  clientId: text(40).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(100),
});

export const orderStatusSchema = z.object({
  status: z.enum(ENUMS.ORDER_STATUS),
  reason: text(300).optional(),
});

/* qr */
export const qrScanSchema = z.object({ payload: z.string().min(1).max(4096) });

/* account requests */
export const accountRequestSchema = z.object({
  name: reqText(100),
  employeeId: reqText(30),
  email,
  phone: text(20).optional(),
  department: reqText(60),
  designation: text(60).optional(),
  mealBenefit: z.enum(["Self Paid", "Complimentary"]).default("Self Paid"),
  photoPath: text(255).optional(),
  supportingDocumentPath: text(255).optional(),
  supportingDocumentName: text(255).optional(),
}).refine((v) => v.mealBenefit !== "Complimentary" || !!v.supportingDocumentPath, {
  path: ["supportingDocumentPath"], message: "A supporting document is required for a Complimentary meal benefit.",
});

export const rejectRequestSchema = z.object({ reason: reqText(300) });

/* settings */
export const settingsPatchSchema = z.object({
  restaurantName: reqText(120).optional(),
  invoicePrefix: reqText(10).optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  displayNameOnBoard: z.enum(["token_only", "name_only", "name_and_token"]).optional(),
  selfOrderStationCode: reqText(120).optional(),
});

export const mealLimitPatchSchema = z.object({
  dailyLimit: z.coerce.number().int().min(1).max(10_000),
});

/* reports / backup */
export const reportRangeQuery = z.object({
  preset: z.enum(["today", "week", "month", "year", "custom"]).default("month"),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export const statementQuery = z.object({
  clientId: text(40).optional(),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(0).max(11),
});

export const backupQuery = z.object({
  kind: z.enum(["daily", "weekly", "monthly"]),
  format: z.enum(["json", "csv"]),
});

/* ── kitchen ──────────────────────────────────────────────────────────── */
const qty = z.coerce.number().positive().max(1_000_000);
const money = z.coerce.number().min(0).max(10_000_000);

export const inventoryItemSchema = z.object({
  name: reqText(80),
  unit: z.enum(ENUMS.INVENTORY_UNITS).default("kg"),
  lowStockQty: z.coerce.number().min(0).max(1_000_000).optional(),
});

export const inventoryItemPatchSchema = z.object({
  name: reqText(80).optional(),
  unit: z.enum(ENUMS.INVENTORY_UNITS).optional(),
  lowStockQty: z.coerce.number().min(0).max(1_000_000).optional(),
  active: z.boolean().optional(),
});

export const stockAdjustSchema = z.object({
  // The counted figure, not a delta — that's what the Manager has in hand.
  newQty: z.coerce.number().min(0).max(1_000_000),
  unitCost: money.optional(),
  note: text(200).optional(),
});

export const shoppingListSchema = z.object({
  forDate: z.iso.date(),
  notes: text(300).optional(),
  items: z.array(z.object({
    itemId: reqText(40),
    qty,
    // Chosen per line, because a market list may be written in grams for an
    // item the store room counts in kilograms.
    unit: z.enum(ENUMS.INVENTORY_UNITS).optional(),
    note: text(120).optional(),
  })).max(100),
});

export const recipeSchema = z.object({
  items: z.array(z.object({
    itemId: reqText(40),
    // Optional on purpose. A dish can list what it needs without committing to
    // an amount, and the shopping list is where the amount is settled anyway.
    defaultQty: z.coerce.number().positive().max(1_000_000).nullable().optional(),
    defaultUnit: z.enum(ENUMS.INVENTORY_UNITS).optional(),
    note: text(120).optional(),
  })).max(60),
});

export const purchaseSchema = z.object({
  listId: text(40).optional(),
  purchaseDate: z.iso.date(),
  voucherPath: text(255).optional(),
  notes: text(300).optional(),
  // Delivery and any other charge on the voucher. Spread across the lines, so
  // leaving them out would understate what the food really cost.
  transportCost: money.optional(),
  otherCost: money.optional(),
  otherCostLabel: text(300).optional(),
  // Any number of extra charges on the voucher (labour, ice, packing).
  extraCosts: z.array(z.object({
    label: text(40).optional(),
    amount: money,
  })).max(10).optional(),
  // Per-line cost is required: without it the moving average can't be
  // maintained, and cost per meal would be unanswerable.
  items: z.array(z.object({
    itemId: reqText(40),
    qty,
    unit: z.enum(ENUMS.INVENTORY_UNITS).optional(),
    lineCost: money,
  })).min(1).max(100),
});

export const consumptionSchema = z.object({
  usedDate: z.iso.date(),
  items: z.array(z.object({
    itemId: reqText(40),
    qty,
    note: text(120).optional(),
  })).min(1).max(100),
});

export const costRangeSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(0).max(11),
});

export const uploadKindSchema = z.object({
  kind: z.enum(["avatars", "menu-items", "documents", "vouchers"]),
});