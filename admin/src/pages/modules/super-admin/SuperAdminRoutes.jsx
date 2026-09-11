import { lazy } from "react";

const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const SuperAdminClients = lazy(() => import("./pages/SuperAdminClients"));
const SuperAdminMenu = lazy(() => import("./pages/SuperAdminMenu"));
const MenuItemForm = lazy(() => import("./pages/MenuItemForm"));
const StaffManagement = lazy(() => import("./pages/StaffManagement"));

const FinancialDashboard = lazy(() => import("./pages/FinancialDashboard"));
const AccountRequests = lazy(() => import("./pages/AccountRequests"));
const AccountRequestDetail = lazy(() => import("./pages/AccountRequestDetail"));
const ClientProfileView = lazy(() => import("./pages/ClientProfileView"));
const CreateClient = lazy(() => import("./pages/CreateClient"));
const BulkImportClients = lazy(() => import("./pages/BulkImportClients"));
const WelcomeEmailPage = lazy(() => import("./pages/WelcomeEmailPage"));
const RecycleBin = lazy(() => import("./pages/RecycleBin"));
const SystemBackup = lazy(() => import("./pages/SystemBackup"));
const ClientStatements = lazy(() => import("./pages/ClientStatements"));
const StaffForm = lazy(() => import("./pages/StaffForm"));
const MealAttendance = lazy(() => import("../manager/pages/MealAttendance"));
const SuperAdminProfile = lazy(() => import("./pages/SuperAdminProfile"));

const SuperAdminRoutes = [
  { index: true, element: <SuperAdminDashboard /> },
  { path: "profile", element: <SuperAdminProfile /> },
  { path: "clients", element: <SuperAdminClients /> },
  { path: "clients/new", element: <CreateClient /> },
  { path: "clients/import", element: <BulkImportClients /> },
  { path: "clients/:id", element: <ClientProfileView /> },
  { path: "welcome-email/:userId", element: <WelcomeEmailPage /> },
  { path: "account-requests/:id", element: <AccountRequestDetail /> },
  { path: "recycle-bin", element: <RecycleBin /> },
  { path: "system-backup", element: <SystemBackup /> },
  { path: "client-statements", element: <ClientStatements /> },
  { path: "attendance", element: <MealAttendance /> },
  { path: "managers", element: <StaffManagement title="Manager Management" /> },

  { path: "staff/new", element: <StaffForm /> },
  { path: "menu", element: <SuperAdminMenu /> },
  { path: "menu/new", element: <MenuItemForm /> },
  { path: "menu/:id", element: <MenuItemForm /> },
  { path: "financial-dashboard", element: <FinancialDashboard /> },
  { path: "account-requests", element: <AccountRequests /> },
];

export default SuperAdminRoutes;
