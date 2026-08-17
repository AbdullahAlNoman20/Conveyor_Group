// FILE: src/pages/modules/client/ClientRoutes.jsx (MODIFIED — add order detail route)
import { lazy } from "react";

const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientQRCard = lazy(() => import("./pages/ClientQRCard"));
const ClientOrders = lazy(() => import("./pages/ClientOrders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail")); // NEW
const ClientPreBooking = lazy(() => import("./pages/ClientPreBooking"));
const ClientGuestRequest = lazy(() => import("./pages/ClientGuestRequest"));
const ClientWallet = lazy(() => import("./pages/ClientWallet"));
const ClientWalletTransactionDetail = lazy(() => import("./pages/ClientWalletTransactionDetail"));
const ClientStatement = lazy(() => import("./pages/ClientStatement"));
const ClientInvoices = lazy(() => import("./pages/ClientInvoices"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));
const PlaceOrder = lazy(() => import("./pages/PlaceOrder"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const ClientSpendDetail = lazy(() => import("./pages/ClientSpendDetail"));

const ClientRoutes = [
  { index: true, element: <ClientDashboard /> },
  { path: "qr-card", element: <ClientQRCard /> },
  { path: "profile", element: <ClientProfile /> },
  { path: "place-order", element: <PlaceOrder /> },
  { path: "order-confirmation/:id", element: <OrderConfirmation /> },
  { path: "spend-detail", element: <ClientSpendDetail /> },
  { path: "orders", element: <ClientOrders /> },
  { path: "orders/:id", element: <OrderDetail /> }, // NEW
  { path: "pre-booking", element: <ClientPreBooking /> },
  { path: "guest-request", element: <ClientGuestRequest /> },
  { path: "statement", element: <ClientStatement /> },
  { path: "invoices", element: <ClientInvoices /> },
  { path: "wallet", element: <ClientWallet /> },
  { path: "wallet/:id", element: <ClientWalletTransactionDetail /> },
];

export default ClientRoutes;