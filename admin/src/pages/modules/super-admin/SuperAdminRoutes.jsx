import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminClients from "./pages/SuperAdminClients";
import SuperAdminMenu from "./pages/SuperAdminMenu";
import SuperAdminTables from "./pages/SuperAdminTables";
import StaffManagement from "./pages/StaffManagement";
import RestaurantSettings from "./pages/RestaurantSettings";
import QRManagement from "./pages/QRManagement";
import FinancialDashboard from "./pages/FinancialDashboard";
import Subsidy from "./pages/Subsidy";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import PurchaseVoucher from "../manager/pages/PurchaseVoucher";
import ComingSoon from "../../../components/shared/ComingSoon";

const placeholder = (title) => <ComingSoon title={title} />;

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
