// server/src/constants/permissions.ts

/**
 * Every capability the app gates on. Roles are a convenient default bundle;
 * the real check is always a permission, so a Super Admin can hand one duty to
 * one person without inventing a role for it.
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
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

/** Grouped for the admin UI, with wording a non-engineer can act on. */
export const PERMISSION_GROUPS: {
  group: string;
  items: { key: Permission; label: string; description: string }[];
}[] = [
  {
    group: "Menu",
    items: [
      { key: PERMISSIONS.MENU_VIEW, label: "View menu", description: "See the dish list and prices." },
      { key: PERMISSIONS.MENU_MANAGE, label: "Manage menu", description: "Add, edit and remove dishes." },
      { key: PERMISSIONS.WEEKLY_MENU_MANAGE, label: "Plan weekly menu", description: "Set which dish is served each day." },
    ],
  },
  {
    group: "Employees",
    items: [
      { key: PERMISSIONS.CLIENT_VIEW, label: "View employees", description: "Browse employee profiles." },
      { key: PERMISSIONS.CLIENT_MANAGE, label: "Manage employees", description: "Create, edit, suspend and reissue QR cards." },
      { key: PERMISSIONS.CLIENT_IMPORT, label: "Bulk import", description: "Create many accounts from a spreadsheet." },
      { key: PERMISSIONS.ACCOUNT_REQUEST_MANAGE, label: "Approve registrations", description: "Accept or reject self-registrations." },
      { key: PERMISSIONS.STAFF_MANAGE, label: "Manage staff logins", description: "Create and disable Manager / Accounts accounts." },
    ],
  },
  {
    group: "Meals & Attendance",
    items: [
      { key: PERMISSIONS.ORDER_VIEW, label: "View orders", description: "See today's orders and the token board." },
      { key: PERMISSIONS.ORDER_SCAN, label: "Scan QR to serve", description: "Scan an employee card and issue their meal." },
      { key: PERMISSIONS.ATTENDANCE_VIEW, label: "View attendance", description: "See who took, cancelled or missed each day's meal." },
      { key: PERMISSIONS.ATTENDANCE_SWEEP, label: "Close the day", description: "Charge employees who missed without cancelling." },
    ],
  },
  {
    group: "Kitchen",
    items: [
      { key: PERMISSIONS.KITCHEN_SHOPPING, label: "Make shopping lists", description: "Plan what to buy at the market." },
      { key: PERMISSIONS.KITCHEN_PURCHASE, label: "Add purchases", description: "Put in vouchers and prices, and add goods to stock." },
      { key: PERMISSIONS.KITCHEN_INVENTORY, label: "Manage store room", description: "Write down daily use and fix stock counts." },
      { key: PERMISSIONS.KITCHEN_COST_VIEW, label: "See food cost", description: "Compare the cost of one meal with the price charged." },
    ],
  },
  {
    group: "Reports & System",
    items: [
      { key: PERMISSIONS.REPORT_VIEW, label: "View reports", description: "Who ate, salary summaries." },
      { key: PERMISSIONS.STATEMENT_VIEW, label: "View statements", description: "Open any employee's monthly statement." },
      { key: PERMISSIONS.BACKUP_EXPORT, label: "Export backups", description: "Download system data." },
      { key: PERMISSIONS.SETTINGS_MANAGE, label: "Manage settings", description: "Restaurant settings and daily meal limit." },
      { key: PERMISSIONS.PERMISSION_MANAGE, label: "Manage permissions", description: "Grant or revoke access for other staff." },
    ],
  },
];

export const STAFF_ROLES = ["super_admin", "manager", "accounts"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  accounts: "Accounts",
  client: "Client",
};

const P = PERMISSIONS;

/**
 * Default bundles. Manager and Accounts overlap deliberately on viewing: both
 * need the same picture of the operation, they just act on different parts.
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: ALL_PERMISSIONS,

  manager: [
    P.MENU_VIEW,
    P.WEEKLY_MENU_MANAGE,
    P.CLIENT_VIEW,
    // Needed to open a profile and print a replacement card at the counter.
    P.CLIENT_MANAGE,
    P.ORDER_VIEW,
    P.ORDER_SCAN,
    P.ATTENDANCE_VIEW,
    P.ATTENDANCE_SWEEP,
    // Read-only on the kitchen: the Accounts role runs procurement, the
    // Manager just needs to see what a meal is costing.
    P.KITCHEN_COST_VIEW,
    P.REPORT_VIEW,
    P.STATEMENT_VIEW,
  ],

  accounts: [
    P.MENU_VIEW,
    // Accounts plans the week, because the plan is what decides the shopping.
    P.WEEKLY_MENU_MANAGE,
    P.CLIENT_VIEW,
    P.ORDER_VIEW,
    P.ATTENDANCE_VIEW,
    P.KITCHEN_SHOPPING,
    P.KITCHEN_PURCHASE,
    P.KITCHEN_INVENTORY,
    P.KITCHEN_COST_VIEW,
    P.REPORT_VIEW,
    P.STATEMENT_VIEW,
  ],

  // Clients reach only their own self-service endpoints, which are gated by
  // role rather than by permission.
  client: [],
};

export const defaultPermissionsFor = (role: string): Permission[] =>
  ROLE_PERMISSIONS[role] ?? [];