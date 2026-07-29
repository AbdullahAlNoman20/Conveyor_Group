import DashboardLayout from "../../../../components/layout/DashboardLayout";
import { LayoutDashboard, ClipboardList, Receipt } from "lucide-react";

const navGroups = [
  {
    title: "Overview",
    items: [{ to: "/app/guest", label: "Dashboard", Icon: LayoutDashboard, end: true }],
  },
  {
    title: "My Visit",
    items: [
      { to: "/app/guest/orders", label: "Active Orders", Icon: ClipboardList },
      { to: "/app/guest/invoices", label: "Invoice History", Icon: Receipt },
    ],
  },
];

export default function GuestLayout() {
  return <DashboardLayout navGroups={navGroups} roleLabel="Guest" />;
}
