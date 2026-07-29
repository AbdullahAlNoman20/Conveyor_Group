import DashboardLayout from "../../../../components/layout/DashboardLayout";
import { LayoutDashboard, PackageCheck, Truck, CheckCircle2 } from "lucide-react";

const navGroups = [
  {
    title: "Overview",
    items: [{ to: "/app/waiter", label: "Dashboard", Icon: LayoutDashboard, end: true }],
  },
  {
    title: "Orders",
    items: [
      { to: "/app/waiter/ready", label: "Ready Orders", Icon: PackageCheck },
      { to: "/app/waiter/assigned", label: "Assigned Orders", Icon: Truck },
      { to: "/app/waiter/delivered", label: "Delivered Orders", Icon: CheckCircle2 },
    ],
  },
];

export default function WaiterLayout() {
  return <DashboardLayout navGroups={navGroups} roleLabel="Waiter" />;
}
