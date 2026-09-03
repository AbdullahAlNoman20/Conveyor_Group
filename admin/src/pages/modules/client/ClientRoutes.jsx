import { lazy } from "react";

const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientQRCard = lazy(() => import("./pages/ClientQRCard"));
const ClientOrders = lazy(() => import("./pages/ClientOrders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const ClientWallet = lazy(() => import("./pages/ClientWallet"));
const ClientStatement = lazy(() => import("./pages/ClientStatement"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));
const PlaceOrder = lazy(() => import("./pages/PlaceOrder"));

const ClientRoutes = [
  { index: true, element: <ClientDashboard /> },
  { path: "qr-card", element: <ClientQRCard /> },
  { path: "profile", element: <ClientProfile /> },
  { path: "place-order", element: <PlaceOrder /> },
  { path: "orders", element: <ClientOrders /> },
  { path: "orders/:id", element: <OrderDetail /> },
  { path: "statement", element: <ClientStatement /> },
  { path: "wallet", element: <ClientWallet /> },
];

export default ClientRoutes;