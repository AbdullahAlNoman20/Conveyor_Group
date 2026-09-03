import { lazy } from "react";

const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const SuperAdminClients = lazy(() => import("./pages/SuperAdminClients"));
const SuperAdminMenu = lazy(() => import("./pages/SuperAdminMenu"));
const MenuItemForm = lazy(() => import("./pages/MenuItemForm"));
const StaffManagement = lazy(() => import("./pages/StaffManagement"));
const StaffForm = lazy(() => import("./pages/StaffForm"));
const StaffProfileView = lazy(() => import("./pages/StaffProfileView"));
const FinancialDashboard = lazy(() => import("./pages/FinancialDashboard"));
const AccountRequests = lazy(() => import("./pages/AccountRequests"));
const AccountRequestDetail = lazy(() => import("./pages/AccountRequestDetail"));
const ClientProfileView = lazy(() => import("./pages/ClientProfileView"));
const CreateClient = lazy(() => import("./pages/CreateClient"));
const WelcomeEmailPage = lazy(() => import("./pages/WelcomeEmailPage"));
const RecycleBin = lazy(() => import("./pages/RecycleBin"));
const SystemBackup = lazy(() => import("./pages/SystemBackup"));

const SuperAdminRoutes = [
  { index: true, element: <SuperAdminDashboard /> },
  { path: "clients", element: <SuperAdminClients /> },
  { path: "clients/new", element: <CreateClient /> },
  { path: "clients/:id", element: <ClientProfileView /> },
  { path: "welcome-email/:userId", element: <WelcomeEmailPage /> },
  { path: "account-requests/:id", element: <AccountRequestDetail /> },
  { path: "recycle-bin", element: <RecycleBin /> },
  { path: "system-backup", element: <SystemBackup /> },
  {
    path: "managers",
    element: (
      <StaffManagement
        title="Manager Management"
        storageKey="managers"
        seedFile="managers.json"
        idPrefix="MG"
        showEmail
        loginRole="manager"
        routeType="managers"
      />
    ),
  },
  {
    path: "kitchen-staff",
    element: (
      <StaffManagement
        title="Kitchen Staff Management"
        storageKey="kitchenStaff"
        seedFile="kitchen-staff.json"
        idPrefix="KS"
        showEmail={false}
        roleField
        loginRole="kitchen_head"
        routeType="kitchen-staff"
      />
    ),
  },
  { path: "staff/new", element: <StaffForm /> },
  { path: "staff/:id", element: <StaffProfileView /> },
  { path: "menu", element: <SuperAdminMenu /> },
  { path: "menu/new", element: <MenuItemForm /> },
  { path: "menu/:id", element: <MenuItemForm /> },
  { path: "financial-dashboard", element: <FinancialDashboard /> },
  { path: "account-requests", element: <AccountRequests /> },
];

export default SuperAdminRoutes;