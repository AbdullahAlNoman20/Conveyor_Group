// admin/src/components/constants/roles.js
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  MANAGER: "manager",
  ACCOUNTS: "accounts",
  CLIENT: "client",
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.MANAGER]: "Manager",
  [ROLES.ACCOUNTS]: "Accounts",
  [ROLES.CLIENT]: "Client",
};

export const ROLE_HOME_ROUTE = {
  [ROLES.SUPER_ADMIN]: "/app/super-admin",
  [ROLES.MANAGER]: "/app/manager",
  [ROLES.ACCOUNTS]: "/app/accounts",
  [ROLES.CLIENT]: "/app/client",
};

export const ROLE_BADGE_COLOR = {
  [ROLES.SUPER_ADMIN]: "bg-ink-950 text-white",
  [ROLES.MANAGER]: "bg-brand-600 text-white",
  [ROLES.ACCOUNTS]: "bg-sky-600 text-white",
  [ROLES.CLIENT]: "bg-emerald-600 text-white",
};

/**
 * Mirrors server/src/constants/permissions.ts. Used only to hide controls the
 * server would refuse anyway — never as the enforcement itself.
 */
export const PERMISSIONS = {
  MENU_VIEW: "menu.view",
  MENU_MANAGE: "menu.manage",
  WEEKLY_MENU_MANAGE: "weekly_menu.manage",
  CLIENT_VIEW: "client.view",
  CLIENT_MANAGE: "client.manage",
  CLIENT_IMPORT: "client.import",
  STAFF_MANAGE: "staff.manage",
  ACCOUNT_REQUEST_MANAGE: "account_request.manage",
  ORDER_VIEW: "order.view",
  ORDER_SCAN: "order.scan",
  ATTENDANCE_VIEW: "attendance.view",
  ATTENDANCE_SWEEP: "attendance.sweep",
  KITCHEN_SHOPPING: "kitchen.shopping",
  KITCHEN_PURCHASE: "kitchen.purchase",
  KITCHEN_INVENTORY: "kitchen.inventory",
  KITCHEN_COST_VIEW: "kitchen.cost_view",
  REPORT_VIEW: "report.view",
  STATEMENT_VIEW: "statement.view",
  BACKUP_EXPORT: "backup.export",
  SETTINGS_MANAGE: "settings.manage",
  PERMISSION_MANAGE: "permission.manage",
};