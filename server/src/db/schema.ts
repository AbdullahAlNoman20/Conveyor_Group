// server/src/db/schema.ts
import {
  pgTable, text, integer, numeric, boolean, timestamp, date,
  jsonb, serial, primaryKey, index, uniqueIndex, check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const ROLES = ["super_admin", "manager", "client"] as const;
const USER_STATUS = ["active", "suspended", "disabled"] as const;
const CLIENT_STATUS = ["active", "suspended", "archived"] as const;
const QR_STATUS = ["active", "expired"] as const;
const MEAL_PLANS = ["Fixed Company Meal"] as const;
const MEAL_BENEFITS = ["Company Subsidized", "Complimentary", "Self Paid"] as const;
const EMPLOYMENT_TYPES = ["Company Employee", "External Client", "Contractor", "Temporary Employee"] as const;
const MENU_CATEGORIES = ["Fixed Meal", "Custom Menu", "Beverage", "Evening Snack"] as const;
const ORDER_STATUS = ["awaiting_manager", "pending", "accepted", "preparing", "ready", "completed", "delayed", "cancelled", "rejected"] as const;
const ORDER_TYPES = ["dine_in", "take_away", "self_order"] as const;
const PRIORITIES = ["normal", "high", "urgent"] as const;
const PAYMENT_METHODS = ["salary", "complimentary"] as const;
const REQUEST_STATUS = ["pending", "approved", "rejected"] as const;
const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

const inList = (col: string, values: readonly string[]) =>
  sql.raw(`${col} IN (${values.map((v) => `'${v.replace(/'/g, "''")}'`).join(",")})`);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull().default("active"),
  department: text("department"),
  designation: text("designation"),
  employeeId: text("employee_id"),
  employmentType: text("employment_type"),
  mealPlan: text("meal_plan"),
  mealBenefit: text("meal_benefit"),
  avatarColor: text("avatar_color"),
  photoPath: text("photo_path"),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`),
  index("users_role_status_idx").on(t.role, t.status),
  check("users_role_chk", inList("role", ROLES)),
  check("users_status_chk", inList("status", USER_STATUS)),
]);

export const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  employeeId: text("employee_id").notNull(),
  email: text("email"),
  phone: text("phone"),
  department: text("department"),
  designation: text("designation"),
  employmentType: text("employment_type").notNull().default("Company Employee"),
  mealPlan: text("meal_plan").notNull().default("Fixed Company Meal"),
  mealBenefit: text("meal_benefit").notNull().default("Self Paid"),
  supportingDocumentPath: text("supporting_document_path"),
  supportingDocumentName: text("supporting_document_name"),
  qrStatus: text("qr_status").notNull().default("active"),
  // Permanent, printed on the physical card. Rotated only on Reissue.
  qrToken: text("qr_token").notNull(),
  qrIssuedAt: timestamp("qr_issued_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull().default("active"),
  prevStatus: text("prev_status"),
  photoPath: text("photo_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("clients_employee_id_uq").on(t.employeeId),
  uniqueIndex("clients_qr_token_uq").on(t.qrToken),
  uniqueIndex("clients_user_id_uq").on(t.userId),
  index("clients_status_idx").on(t.status),
  check("clients_status_chk", inList("status", CLIENT_STATUS)),
  check("clients_qr_status_chk", inList("qr_status", QR_STATUS)),
  check("clients_meal_plan_chk", inList("meal_plan", MEAL_PLANS)),
  check("clients_meal_benefit_chk", inList("meal_benefit", MEAL_BENEFITS)),
  check("clients_employment_type_chk", inList("employment_type", EMPLOYMENT_TYPES)),
]);

export const managers = pgTable("managers", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("managers_email_uq").on(sql`lower(${t.email})`),
]);

export const menuItems = pgTable("menu_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  available: boolean("available").notNull().default(true),
  description: text("description"),
  spiceLevel: text("spice_level"),
  calories: integer("calories"),
  allergens: text("allergens").array().notNull().default(sql`'{}'::text[]`),
  imagePath: text("image_path"),
  imageName: text("image_name"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("menu_items_category_available_idx").on(t.category, t.available),
  check("menu_items_category_chk", inList("category", MENU_CATEGORIES)),
  check("menu_items_price_chk", sql`price > 0`),
]);

export const weeklyMenu = pgTable("weekly_menu", {
  day: text("day").primaryKey(),
  mealName: text("meal_name").notNull(),
  menuItemId: text("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
}, () => [
  check("weekly_menu_day_chk", inList("day", DAYS)),
]);

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "restrict" }),
  clientName: text("client_name").notNull(),
  employeeId: text("employee_id"),
  department: text("department"),
  tableNumber: integer("table_number"),
  orderType: text("order_type").notNull(),
  priority: text("priority").notNull().default("normal"),
  specialInstructions: text("special_instructions"),
  // No VAT / discount anywhere — amount is the plain meal price.
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull(),
  selfPlaced: boolean("self_placed").notNull().default(false),
  instantOrder: boolean("instant_order").notNull().default(false),
  consumedMealSlot: boolean("consumed_meal_slot").notNull().default(false),
  orderDate: date("order_date").notNull(),
  placedByUserId: text("placed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("orders_date_status_idx").on(t.orderDate, t.status),
  index("orders_client_id_idx").on(t.clientId),
  index("orders_created_at_idx").on(t.createdAt),
  check("orders_status_chk", inList("status", ORDER_STATUS)),
  check("orders_type_chk", inList("order_type", ORDER_TYPES)),
  check("orders_priority_chk", inList("priority", PRIORITIES)),
  check("orders_payment_chk", inList("payment_method", PAYMENT_METHODS)),
  check("orders_amount_chk", sql`amount >= 0`),
]);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  menuItemId: text("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  qty: integer("qty").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
}, (t) => [
  index("order_items_order_id_idx").on(t.orderId),
  check("order_items_qty_chk", sql`qty > 0`),
]);

export const accountRequests = pgTable("account_requests", {
  id: text("id").primaryKey(),
  photoPath: text("photo_path"),
  name: text("name").notNull(),
  employeeId: text("employee_id").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  department: text("department").notNull(),
  designation: text("designation"),
  employmentType: text("employment_type").notNull().default("Company Employee"),
  mealPlan: text("meal_plan").notNull().default("Fixed Company Meal"),
  mealBenefit: text("meal_benefit").notNull().default("Self Paid"),
  supportingDocumentPath: text("supporting_document_path"),
  supportingDocumentName: text("supporting_document_name"),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  decidedBy: text("decided_by").references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("account_requests_status_idx").on(t.status, t.createdAt),
  check("account_requests_status_chk", inList("status", REQUEST_STATUS)),
]);

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  event: text("event").notNull(),
  message: text("message").notNull(),
  recipientRoles: text("recipient_roles").array().notNull().default(sql`'{}'::text[]`),
  recipientUserIds: text("recipient_user_ids").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("notifications_created_at_idx").on(t.createdAt),
]);

export const notificationReads = pgTable("notification_reads", {
  notificationId: text("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.notificationId, t.userId] }),
]);

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  restaurantName: text("restaurant_name").notNull().default("Conveyor Group Restaurant"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  smsNotifications: boolean("sms_notifications").notNull().default(false),
  displayNameOnBoard: text("display_name_on_board").notNull().default("token_only"),
  selfOrderStationCode: text("self_order_station_code").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, () => [
  check("settings_singleton_chk", sql`id = 1`),
]);

export const mealLimits = pgTable("meal_limits", {
  date: date("date").primaryKey(),
  dailyLimit: integer("daily_limit").notNull(),
  served: integer("served").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, () => [
  check("meal_limits_served_chk", sql`served >= 0`),
]);

export const refreshTokens = pgTable("refresh_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  userAgent: text("user_agent"),
  ip: text("ip"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("refresh_tokens_user_idx").on(t.userId),
]);

export const auditLogs = pgTable("audit_logs", {
  id: text("id").notNull(),
  actorId: text("actor_id"),
  actorRole: text("actor_role"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  requestId: text("request_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const storageObjects = pgTable("storage_objects", {
  path: text("path").primaryKey(),
  bucket: text("bucket").notNull(),
  ownerEntity: text("owner_entity"),
  ownerId: text("owner_id"),
  orphanedAt: timestamp("orphaned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("storage_objects_orphaned_idx").on(t.orphanedAt),
]);

export const ENUMS = {
  ROLES, USER_STATUS, CLIENT_STATUS, QR_STATUS, MEAL_PLANS, MEAL_BENEFITS,
  EMPLOYMENT_TYPES, MENU_CATEGORIES, ORDER_STATUS, ORDER_TYPES, PRIORITIES,
  PAYMENT_METHODS, REQUEST_STATUS, DAYS,
};