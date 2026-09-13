// backend/src/schemas/index.ts
import { z } from "zod";
import { ENUMS } from "../db/schema.js";

const text = (max: number) => z.string().trim().max(max);
const reqText = (max: number) => text(max).min(1);
const email = z.email().trim().toLowerCase().max(254);
const strongPassword = z.string().min(10).max(128)
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

export const weeklyMenuSchema = z.object({
  days: z.array(z.object({ day: z.enum(ENUMS.DAYS), meal: reqText(100) })).length(7),
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

export const uploadKindSchema = z.object({
  kind: z.enum(["avatars", "menu-items", "documents"]),
});