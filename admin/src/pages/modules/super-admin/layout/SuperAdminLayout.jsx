import DashboardLayout from "../../../../components/layout/DashboardLayout";
import {
  LayoutDashboard,
  Users,
  UserCog,
  UtensilsCrossed,
  Wallet,
  UserPlus,
  Archive,
  HardDriveDownload,
  FileText,
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
      { to: "/app/super-admin/account-requests", label: "Account Requests", Icon: UserPlus },
      { to: "/app/super-admin/recycle-bin", label: "Recycle Bin", Icon: Archive },
    ],
  }, 
  {
    title: "Restaurant",
    items: [{ to: "/app/super-admin/menu", label: "Menu Management", Icon: UtensilsCrossed }],
  },
  {
    title: "Finance & Data",
    items: [
      { to: "/app/super-admin/financial-dashboard", label: "Who Ate / Salary Summary", Icon: Wallet },
      { to: "/app/super-admin/client-statements", label: "Client Statements", Icon: FileText },
      { to: "/app/super-admin/system-backup", label: "System Backup", Icon: HardDriveDownload },
    ],
  },
];

export default function SuperAdminLayout() {
  return <DashboardLayout navGroups={navGroups} roleLabel="Super Admin" />;
}