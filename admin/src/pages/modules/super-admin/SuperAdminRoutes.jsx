import { lazy } from "react";

const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const SuperAdminClients = lazy(() => import("./pages/SuperAdminClients"));
const SuperAdminMenu = lazy(() => import("./pages/SuperAdminMenu"));
const SuperAdminTables = lazy(() => import("./pages/SuperAdminTables"));
const StaffManagement = lazy(() => import("./pages/StaffManagement"));
const RestaurantSettings = lazy(() => import("./pages/RestaurantSettings"));
const QRManagement = lazy(() => import("./pages/QRManagement"));
const FinancialDashboard = lazy(() => import("./pages/FinancialDashboard"));
const Subsidy = lazy(() => import("./pages/Subsidy"));
const Reports = lazy(() => import("./pages/Reports"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const PurchaseVoucher = lazy(() => import("../manager/pages/PurchaseVoucher"));

const SuperAdminRoutes = [
  { index: true, element: <SuperAdminDashboard /> },
  { path: "clients", element: <SuperAdminClients /> },
  {
    path: "managers",
    element: (
      <StaffManagement
        title="Manager Management"
        storageKey="managers"
        seedFile="managers.json"
        idPrefix="MG"
        showEmail
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
      />
    ),
  },
  { path: "menu", element: <SuperAdminMenu /> },
  { path: "tables", element: <SuperAdminTables /> },
  { path: "settings", element: <RestaurantSettings /> },
  { path: "qr-management", element: <QRManagement /> },
  { path: "financial-dashboard", element: <FinancialDashboard /> },
  { path: "subsidy", element: <Subsidy /> },
  { path: "purchase", element: <PurchaseVoucher /> },
  { path: "reports", element: <Reports /> },
  { path: "audit", element: <AuditLogs /> },
];

export default SuperAdminRoutes;
