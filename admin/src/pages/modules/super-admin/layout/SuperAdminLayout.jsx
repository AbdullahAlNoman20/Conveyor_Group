import DashboardLayout from "../../../../components/layout/DashboardLayout";
import {
  LayoutDashboard,
  Users,
  UserCog,
  ChefHat,
  UtensilsCrossed,
  Armchair,
  Settings,
  Wallet,
  Banknote,
  ShoppingCart,
  BarChart3,
  QrCode,
  ShieldCheck,
  HardDriveDownload,
  Archive,
  UserPlus,
} from "lucide-react";

const navGroups = [
  {
    title: "Overview",
    items: [{ to: "/app/super-admin", label: "Dashboard", Icon: LayoutDashboard, end: true }],
  },
  {
    title: "User Management",
    items: [
      { to: "/app/super-admin/clients", label: "Clients", Icon: Users },
      { to: "/app/super-admin/managers", label: "Managers", Icon: UserCog },
      { to: "/app/super-admin/kitchen-staff", label: "Kitchen Staff", Icon: ChefHat },
      { to: "/app/super-admin/registration-archive", label: "Registration Archive", Icon: Archive },
      { to: "/app/super-admin/account-requests", label: "Account Requests", Icon: UserPlus },
    ],
  },
  {
    title: "Restaurant",
    items: [
      { to: "/app/super-admin/menu", label: "Menu Management", Icon: UtensilsCrossed },
      { to: "/app/super-admin/tables", label: "Table Management", Icon: Armchair },
      { to: "/app/super-admin/settings", label: "Restaurant Settings", Icon: Settings },
    ],
  },
  {
    title: "QR Management",
    items: [{ to: "/app/super-admin/qr-management", label: "QR Codes", Icon: QrCode }],
  },
  {
    title: "Finance",
    items: [
      { to: "/app/super-admin/financial-dashboard", label: "Financial Dashboard", Icon: Wallet },
      { to: "/app/super-admin/subsidy", label: "Company Subsidy", Icon: Banknote },
      { to: "/app/super-admin/purchase", label: "Purchase & Expense", Icon: ShoppingCart },
    ],
  },
  {
    title: "Reports & Security",
    items: [
      { to: "/app/super-admin/reports", label: "Reports & Analytics", Icon: BarChart3 },
      { to: "/app/super-admin/audit", label: "Audit Logs", Icon: ShieldCheck },
      { to: "/app/super-admin/system-backup", label: "System Backup", Icon: HardDriveDownload },
    ],
  },
];

export default function SuperAdminLayout() {
  return <DashboardLayout navGroups={navGroups} roleLabel="Super Admin" />;
}
