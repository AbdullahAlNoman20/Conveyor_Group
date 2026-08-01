import DashboardLayout from "../../../../components/layout/DashboardLayout";
import {
  LayoutDashboard,
  ScanLine,
  ClipboardPlus,
  ClipboardCheck as ApprovalIcon,
  ChefHat,
  UserPlus,
  ClipboardCheck,
  CalendarRange,
  Wallet,
  Receipt,
  BarChart3,
  Monitor,
} from "lucide-react";

const navGroups = [
  {
    title: "Overview",
    items: [{ to: "/app/manager", label: "Dashboard", Icon: LayoutDashboard, end: true }],
  },
  {
    title: "Operations",
    items: [
      { to: "/app/manager/scan-qr", label: "Scan QR", Icon: ScanLine },
      { to: "/app/manager/new-order", label: "New Order", Icon: ClipboardPlus },
      { to: "/app/manager/order-approvals", label: "Order Approvals", Icon: ApprovalIcon },
      { to: "/app/manager/kitchen-queue", label: "Kitchen Queue", Icon: ChefHat },
      { to: "/kitchen/board", label: "Token Display Board", Icon: Monitor },
    ],
  },
  {
    title: "Guests",
    items: [
      { to: "/app/manager/guests", label: "Guest Management", Icon: UserPlus },
      { to: "/app/manager/guest-requests", label: "Guest Requests", Icon: ClipboardCheck },
      { to: "/app/manager/profile-requests", label: "Profile Change Requests", Icon: ClipboardCheck },
    ],
  },
  {
    title: "Meal Planning",
    items: [
      { to: "/app/manager/meal-planner", label: "Weekly Menu Planner", Icon: CalendarRange },
      { to: "/app/manager/pre-bookings", label: "Meal Pre-Bookings", Icon: CalendarRange },
    ],
  },
  {
    title: "Finance",
    items: [
      { to: "/app/manager/wallet-recharge", label: "Wallet Recharge", Icon: Wallet },
      { to: "/app/manager/purchase", label: "Purchase Voucher", Icon: Receipt },
    ],
  },
  {
    title: "Reports",
    items: [{ to: "/app/manager/reports", label: "Reports", Icon: BarChart3 }],
  },
];

export default function ManagerLayout() {
  return <DashboardLayout navGroups={navGroups} roleLabel="Manager" />;
}
