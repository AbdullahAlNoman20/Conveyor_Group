import { lazy } from "react";

const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const ScanQR = lazy(() => import("./pages/ScanQR"));
const MealPlanner = lazy(() => import("./pages/MealPlanner"));
const ManagerReports = lazy(() => import("./pages/ManagerReports"));
const ClientStatements = lazy(() => import("./pages/ClientStatements"));
const ManagerProfile = lazy(() => import("./pages/ManagerProfile"));

const ManagerRoutes = [
  { index: true, element: <ManagerDashboard /> },
  { path: "profile", element: <ManagerProfile /> },
  { path: "scan-qr", element: <ScanQR /> },
  { path: "meal-planner", element: <MealPlanner /> },
  { path: "reports", element: <ManagerReports /> },
  { path: "client-statements", element: <ClientStatements /> },
];

export default ManagerRoutes;