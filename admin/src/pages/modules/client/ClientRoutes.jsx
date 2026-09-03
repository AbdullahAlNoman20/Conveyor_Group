import { lazy } from "react";

const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientQRCard = lazy(() => import("./pages/ClientQRCard"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const ClientStatement = lazy(() => import("./pages/ClientStatement"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));
const PlaceOrder = lazy(() => import("./pages/PlaceOrder"));

const ClientRoutes = [
  { index: true, element: <ClientDashboard /> },
  { path: "qr-card", element: <ClientQRCard /> },
  { path: "profile", element: <ClientProfile /> },
  { path: "place-order", element: <PlaceOrder /> },
  { path: "order-confirmation/:id", element: <OrderConfirmation /> },
  { path: "orders/:id", element: <OrderDetail /> },
  { path: "statement", element: <ClientStatement /> },
];

export default ClientRoutes;