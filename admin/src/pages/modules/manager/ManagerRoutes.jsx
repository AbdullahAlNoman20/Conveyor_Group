import { lazy } from "react";

const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const ScanQR = lazy(() => import("./pages/ScanQR"));
const MealPlanner = lazy(() => import("./pages/MealPlanner"));
const ManagerReports = lazy(() => import("./pages/ManagerReports"));

const ManagerRoutes = [
  { index: true, element: <ManagerDashboard /> },
  { path: "scan-qr", element: <ScanQR /> },
  { path: "meal-planner", element: <MealPlanner /> },
  { path: "reports", element: <ManagerReports /> },
];

export default ManagerRoutes;