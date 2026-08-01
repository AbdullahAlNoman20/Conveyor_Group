import DashboardLayout from "../../../../components/layout/DashboardLayout";
import {
  LayoutDashboard,
  QrCode,
  History,
  FileText,
  Receipt,
  Wallet,
  CalendarClock,
  UserPlus,
  UtensilsCrossed,
  UserCog,
} from "lucide-react";

const navGroups = [
  {
    title: "Overview",
    items: [{ to: "/app/client", label: "Dashboard", Icon: LayoutDashboard, end: true }],
  },
  {
    title: "My Profile",
    items: [
      { to: "/app/client/qr-card", label: "My QR Card", Icon: QrCode },
      { to: "/app/client/profile", label: "Edit Profile", Icon: UserCog },
    ],
  },
  {
    title: "Meals",
    items: [
      { to: "/app/client/place-order", label: "Place Order", Icon: UtensilsCrossed },
      { to: "/app/client/orders", label: "Order History", Icon: History },
      { to: "/app/client/pre-booking", label: "Meal Pre-Booking", Icon: CalendarClock },
      { to: "/app/client/guest-request", label: "Guest Request", Icon: UserPlus },
    ],
  },
  {
    title: "Billing",
    items: [
      { to: "/app/client/statement", label: "Monthly Statement", Icon: FileText },
      { to: "/app/client/invoices", label: "Invoices", Icon: Receipt },
      { to: "/app/client/wallet", label: "Wallet & Salary", Icon: Wallet },
    ],
  },
];

export default function ClientLayout() {
  return <DashboardLayout navGroups={navGroups} roleLabel="Client" />;
}
