import GuestDashboard from "./pages/GuestDashboard";
import GuestOrders from "./pages/GuestOrders";
import GuestInvoices from "./pages/GuestInvoices";

const GuestRoutes = [
  { index: true, element: <GuestDashboard /> },
  { path: "orders", element: <GuestOrders /> },
  { path: "invoices", element: <GuestInvoices /> },
];

export default GuestRoutes;
