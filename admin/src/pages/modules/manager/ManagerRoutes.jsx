// admin/src/pages/modules/manager/ManagerRoutes.jsx
import { lazy } from "react";

const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const ManagerProfile = lazy(() => import("./pages/ManagerProfile"));
const ScanQR = lazy(() => import("./pages/ScanQR"));
const MealAttendance = lazy(() => import("./pages/MealAttendance"));
const MealPlanner = lazy(() => import("./pages/MealPlanner"));
const ManagerReports = lazy(() => import("./pages/ManagerReports"));
const ClientStatements = lazy(() => import("./pages/ClientStatements"));
const ShoppingList = lazy(() => import("./pages/ShoppingList"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Inventory = lazy(() => import("./pages/Inventory"));
const CostAnalysis = lazy(() => import("./pages/CostAnalysis"));

// Shared with the Super Admin. The server decides what each one may do.
const SuperAdminClients = lazy(() => import("../super-admin/pages/SuperAdminClients"));
const SuperAdminMenu = lazy(() => import("../super-admin/pages/SuperAdminMenu"));
const MenuItemForm = lazy(() => import("../super-admin/pages/MenuItemForm"));
const ClientProfileView = lazy(() => import("../super-admin/pages/ClientProfileView"));
const IdCards = lazy(() => import("../super-admin/pages/IdCards"));
const FinancialDashboard = lazy(() => import("../super-admin/pages/FinancialDashboard"));
const SelfOrderQr = lazy(() => import("../super-admin/pages/SelfOrderQr"));

/**
 * Every route a Manager might reach. The sidebar shows them by permission and
 * the server refuses anything not allowed, so a route here grants nothing.
 */
const ManagerRoutes = [
  { index: true, element: <ManagerDashboard /> },
  { path: "profile", element: <ManagerProfile /> },

  { path: "scan-qr", element: <ScanQR /> },
  { path: "attendance", element: <MealAttendance /> },
  { path: "self-order-qr", element: <SelfOrderQr /> },

  { path: "meal-planner", element: <MealPlanner /> },
  { path: "menu", element: <SuperAdminMenu /> },
  { path: "menu/new", element: <MenuItemForm /> },
  { path: "menu/:id", element: <MenuItemForm /> },

  { path: "kitchen/shopping-list", element: <ShoppingList /> },
  { path: "kitchen/purchases", element: <Purchases /> },
  { path: "kitchen/inventory", element: <Inventory /> },
  { path: "kitchen/costs", element: <CostAnalysis /> },

  { path: "clients", element: <SuperAdminClients /> },
  { path: "clients/:id", element: <ClientProfileView /> },
  { path: "id-cards", element: <IdCards /> },

  { path: "reports", element: <ManagerReports /> },
  { path: "financial-dashboard", element: <FinancialDashboard /> },
  { path: "client-statements", element: <ClientStatements /> },
];

export default ManagerRoutes;