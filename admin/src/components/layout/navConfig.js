// admin/src/components/layout/navConfig.js
import {
  LayoutDashboard, UserCircle, ScanLine, ClipboardCheck, CalendarRange,
  ClipboardList, Receipt, Package, Calculator, BarChart3, FileText,
  Users, UserCog, UserPlus, Archive, UtensilsCrossed, Wallet,
  HardDriveDownload, Monitor, ShieldCheck,
} from "lucide-react";
import { PERMISSIONS as P } from "../constants/roles";

/**
 * One nav definition for every staff role, filtered by permission.
 *
 * Keeping it in one place is what makes delegation visible: granting a Manager
 * the purchasing permission makes the Record Purchase link appear in their
 * sidebar, with no per-role nav list to remember to update.
 *
 * `base` is the role's URL prefix, so the same page is reachable at
 * /app/manager/... or /app/accounts/... without duplicating the config.
 */
export function buildNavGroups(base, can) {
  const groups = [
    {
      title: "Overview",
      items: [
        { to: base, label: "Dashboard", Icon: LayoutDashboard, end: true },
        { to: `${base}/profile`, label: "My Profile", Icon: UserCircle },
      ],
    },
    {
      title: "Operations",
      items: [
        { to: `${base}/scan-qr`, label: "Scan QR — Serve", Icon: ScanLine, permission: P.ORDER_SCAN },
        { to: `${base}/attendance`, label: "Daily Attendance", Icon: ClipboardCheck, permission: P.ATTENDANCE_VIEW },
        { to: "/kitchen/board", label: "Token Board", Icon: Monitor, permission: P.ORDER_VIEW },
      ],
    },
    {
      title: "Meal Planning",
      items: [
        { to: `${base}/meal-planner`, label: "Weekly Menu Planner", Icon: CalendarRange, permission: P.WEEKLY_MENU_MANAGE },
        { to: `${base}/menu`, label: "Menu Management", Icon: UtensilsCrossed, permission: P.MENU_MANAGE },
      ],
    },
    {
      title: "Kitchen & Costs",
      items: [
        { to: `${base}/kitchen/shopping-list`, label: "Shopping List", Icon: ClipboardList, permission: P.KITCHEN_SHOPPING },
        { to: `${base}/kitchen/purchases`, label: "Record Purchase", Icon: Receipt, permission: P.KITCHEN_PURCHASE },
        { to: `${base}/kitchen/inventory`, label: "Inventory & Usage", Icon: Package, permission: P.KITCHEN_INVENTORY },
        { to: `${base}/kitchen/costs`, label: "Cost Analysis", Icon: Calculator, permission: P.KITCHEN_COST_VIEW },
      ],
    },
    {
      title: "Employees",
      items: [
        { to: `${base}/clients`, label: "Employees", Icon: Users, permission: P.CLIENT_VIEW },
        { to: `${base}/account-requests`, label: "Registrations", Icon: UserPlus, permission: P.ACCOUNT_REQUEST_MANAGE },
        { to: `${base}/managers`, label: "Staff Accounts", Icon: UserCog, permission: P.STAFF_MANAGE },
        { to: `${base}/permissions`, label: "Access Control", Icon: ShieldCheck, permission: P.PERMISSION_MANAGE },
        { to: `${base}/recycle-bin`, label: "Recycle Bin", Icon: Archive, permission: P.CLIENT_MANAGE },
      ],
    },
    {
      title: "Reports",
      items: [
        { to: `${base}/reports`, label: "Who Ate", Icon: BarChart3, permission: P.REPORT_VIEW },
        { to: `${base}/financial-dashboard`, label: "Salary Summary", Icon: Wallet, permission: P.REPORT_VIEW },
        { to: `${base}/client-statements`, label: "Client Statements", Icon: FileText, permission: P.STATEMENT_VIEW },
        { to: `${base}/system-backup`, label: "System Backup", Icon: HardDriveDownload, permission: P.BACKUP_EXPORT },
      ],
    },
  ];

  // Drop anything the user can't reach, then drop groups left empty — an
  // empty heading reads like something is broken.
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || can(i.permission)) }))
    .filter((g) => g.items.length > 0);
}