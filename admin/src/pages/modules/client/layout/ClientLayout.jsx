import DashboardLayout from "../../../../components/layout/DashboardLayout";

import {
  LayoutDashboard,
  QrCode,
  FileText,
  UserCog,
  ShoppingCart,
} from "lucide-react";

const navGroups = [
  {
    title: "Overview",
    items: [
      {
        to: "/app/client",
        label: "Dashboard",
        Icon: LayoutDashboard,
        end: true,
      },
    ],
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
      {
        to: "/app/client/place-order",
        label: "Place Order",
        Icon: ShoppingCart,
      },
    ],
  },
  {
    title: "Billing",
    items: [
      {
        to: "/app/client/statement",
        label: "Monthly Statement",
        Icon: FileText,
      },
      
    ],
  },
];

export default function ClientLayout() {
  return <DashboardLayout navGroups={navGroups} roleLabel="Client" />;
}
