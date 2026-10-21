// admin/src/pages/modules/accounts/AccountsRoutes.jsx
import { lazy } from "react";

// The same page components the Manager uses — the server decides what each
// one is allowed to do, so there is nothing role-specific to duplicate.
const AccountsDashboard = lazy(() => import("./pages/AccountsDashboard"));
const ManagerProfile = lazy(() => import("../manager/pages/ManagerProfile"));
const ShoppingList = lazy(() => import("../manager/pages/ShoppingList"));
const Purchases = lazy(() => import("../manager/pages/Purchases"));
const Inventory = lazy(() => import("../manager/pages/Inventory"));
const CostAnalysis = lazy(() => import("../manager/pages/CostAnalysis"));
const MealAttendance = lazy(() => import("../manager/pages/MealAttendance"));
const ManagerReports = lazy(() => import("../manager/pages/ManagerReports"));
const ClientStatements = lazy(() => import("../manager/pages/ClientStatements"));

const AccountsRoutes = [
  { index: true, element: <AccountsDashboard /> },
  { path: "profile", element: <ManagerProfile /> },
  { path: "kitchen/shopping-list", element: <ShoppingList /> },
  { path: "kitchen/purchases", element: <Purchases /> },
  { path: "kitchen/inventory", element: <Inventory /> },
  { path: "kitchen/costs", element: <CostAnalysis /> },
  { path: "attendance", element: <MealAttendance /> },
  { path: "reports", element: <ManagerReports /> },
  { path: "client-statements", element: <ClientStatements /> },
];

export default AccountsRoutes;