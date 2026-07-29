import DashboardLayout from "../../../../components/layout/DashboardLayout";
import { LayoutDashboard, ListOrdered, Timer, AlertTriangle, CalendarClock, Monitor } from "lucide-react";

const navGroups = [
  {
    title: "Overview",
    items: [{ to: "/app/kitchen", label: "Dashboard", Icon: LayoutDashboard, end: true }],
  },
  {
    title: "Kitchen Operations",
    items: [
      { to: "/app/kitchen/queue", label: "Kitchen Queue", Icon: ListOrdered },
      { to: "/app/kitchen/preparation", label: "Preparation Timer", Icon: Timer },
      { to: "/app/kitchen/delays", label: "Delay Management", Icon: AlertTriangle },
    ],
  },
  {
    title: "Planning",
    items: [
      { to: "/app/kitchen/demand-forecast", label: "Demand Forecast", Icon: CalendarClock },
      { to: "/app/kitchen/tomorrow", label: "Tomorrow Planning", Icon: CalendarClock },
    ],
  },
  {
    title: "Display",
    items: [{ to: "/kitchen/board", label: "Live Token Board", Icon: Monitor }],
  },
];

export default function KitchenLayout() {
  return <DashboardLayout navGroups={navGroups} roleLabel="Kitchen Head" />;
}
