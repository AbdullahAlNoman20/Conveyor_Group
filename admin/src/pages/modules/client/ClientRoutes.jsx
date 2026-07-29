import ClientDashboard from "./pages/ClientDashboard";
import ClientQRCard from "./pages/ClientQRCard";
import ClientOrders from "./pages/ClientOrders";
import ClientPreBooking from "./pages/ClientPreBooking";
import ClientGuestRequest from "./pages/ClientGuestRequest";
import ClientWallet from "./pages/ClientWallet";
import ClientStatement from "./pages/ClientStatement";
import ClientInvoices from "./pages/ClientInvoices";

const ClientRoutes = [
  { index: true, element: <ClientDashboard /> },
  { path: "qr-card", element: <ClientQRCard /> },
  { path: "orders", element: <ClientOrders /> },
  { path: "pre-booking", element: <ClientPreBooking /> },
  { path: "guest-request", element: <ClientGuestRequest /> },
  { path: "statement", element: <ClientStatement /> },
  { path: "invoices", element: <ClientInvoices /> },
  { path: "wallet", element: <ClientWallet /> },
];

export default ClientRoutes;
