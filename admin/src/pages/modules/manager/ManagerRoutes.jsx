import { lazy } from "react";

const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const ScanQR = lazy(() => import("./pages/ScanQR"));
const MealAttendance = lazy(() => import("./pages/MealAttendance"));
const ShoppingList = lazy(() => import("./pages/ShoppingList"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Inventory = lazy(() => import("./pages/Inventory"));
const CostAnalysis = lazy(() => import("./pages/CostAnalysis"));
const SuperAdminClients = lazy(() => import("../super-admin/pages/SuperAdminClients"));
const SuperAdminMenu = lazy(() => import("../super-admin/pages/SuperAdminMenu"));
const MealPlanner = lazy(() => import("./pages/MealPlanner"));
const ManagerReports = lazy(() => import("./pages/ManagerReports"));
const ClientStatements = lazy(() => import("./pages/ClientStatements"));
const ManagerProfile = lazy(() => import("./pages/ManagerProfile"));

const ManagerRoutes = [
  { index: true, element: <ManagerDashboard /> },
  { path: "profile", element: <ManagerProfile /> },
  { path: "attendance", element: <MealAttendance /> },
  { path: "kitchen/shopping-list", element: <ShoppingList /> },
  { path: "kitchen/purchases", element: <Purchases /> },
  { path: "kitchen/inventory", element: <Inventory /> },
  { path: "kitchen/costs", element: <CostAnalysis /> },
  { path: "scan-qr", element: <ScanQR /> },
  { path: "meal-planner", element: <MealPlanner /> },
  { path: "reports", element: <ManagerReports /> },
  { path: "client-statements", element: <ClientStatements /> },
  // Reachable only when the permission is granted; the server refuses
  // otherwise, so an unauthorised visit shows an empty screen, not data.
  { path: "clients", element: <SuperAdminClients /> },
  { path: "menu", element: <SuperAdminMenu /> },
];

export default ManagerRoutes;