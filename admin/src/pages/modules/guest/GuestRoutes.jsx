import { lazy } from "react";

const GuestDashboard = lazy(() => import("./pages/GuestDashboard"));
const GuestOrders = lazy(() => import("./pages/GuestOrders"));
const GuestInvoices = lazy(() => import("./pages/GuestInvoices"));

const GuestRoutes = [
  { index: true, element: <GuestDashboard /> },
  { path: "orders", element: <GuestOrders /> },
  { path: "invoices", element: <GuestInvoices /> },
];

export default GuestRoutes;
