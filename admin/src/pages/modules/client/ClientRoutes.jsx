import { lazy } from "react";

const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientQRCard = lazy(() => import("./pages/ClientQRCard"));
const ClientOrders = lazy(() => import("./pages/ClientOrders"));
const ClientPreBooking = lazy(() => import("./pages/ClientPreBooking"));
const ClientGuestRequest = lazy(() => import("./pages/ClientGuestRequest"));
const ClientWallet = lazy(() => import("./pages/ClientWallet"));
const ClientStatement = lazy(() => import("./pages/ClientStatement"));
const ClientInvoices = lazy(() => import("./pages/ClientInvoices"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));
const PlaceOrder = lazy(() => import("./pages/PlaceOrder"));

const ClientRoutes = [
  { index: true, element: <ClientDashboard /> },
  { path: "qr-card", element: <ClientQRCard /> },
  { path: "profile", element: <ClientProfile /> },
  { path: "place-order", element: <PlaceOrder /> },
  { path: "orders", element: <ClientOrders /> },
  { path: "pre-booking", element: <ClientPreBooking /> },
  { path: "guest-request", element: <ClientGuestRequest /> },
  { path: "statement", element: <ClientStatement /> },
  { path: "invoices", element: <ClientInvoices /> },
  { path: "wallet", element: <ClientWallet /> },
];

export default ClientRoutes;
