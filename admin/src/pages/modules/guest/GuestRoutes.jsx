import { lazy } from "react";

const GuestDashboard = lazy(() => import("./pages/GuestDashboard"));
const GuestOrders = lazy(() => import("./pages/GuestOrders"));
const GuestInvoices = lazy(() => import("./pages/GuestInvoices"));
const GuestPlaceOrder = lazy(() => import("./pages/GuestPlaceOrder"));
const GuestOrderTracking = lazy(() => import("./pages/GuestOrderTracking"));

const GuestRoutes = [
  { index: true, element: <GuestDashboard /> },
  { path: "place-order", element: <GuestPlaceOrder /> },
  { path: "orders", element: <GuestOrders /> },
  { path: "orders/:orderId", element: <GuestOrderTracking /> },
  { path: "invoices", element: <GuestInvoices /> },
];

export default GuestRoutes;