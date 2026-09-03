// FILE: src/pages/modules/manager/layout/ManagerLayout.jsx (FIXED — missing FileText import added)
import DashboardLayout from "../../../../components/layout/DashboardLayout";
import {
  LayoutDashboard,
  ScanLine,
  CalendarRange,
  BarChart3,
  Monitor,
  FileText, // FIX: was used below but never imported — crashed the whole module
} from "lucide-react";

const navGroups = [
  {
    title: "Overview",
    items: [
      { to: "/app/manager", label: "Dashboard", Icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/app/manager/scan-qr", label: "Scan QR — Order", Icon: ScanLine },
      { to: "/kitchen/board", label: "Token Display Board", Icon: Monitor },
    ],
  },
  {
    title: "Meal Planning",
    items: [
      { to: "/app/manager/meal-planner", label: "Weekly Menu Planner", Icon: CalendarRange },
    ],
  },
  {
    title: "Reports",
    items: [
      { to: "/app/manager/reports", label: "Who Ate Today / This Month", Icon: BarChart3 },
      { to: "/app/manager/client-statements", label: "Client Statements", Icon: FileText },
    ],
  },
];

export default function ManagerLayout() {
  return <DashboardLayout navGroups={navGroups} roleLabel="Manager" />;
}