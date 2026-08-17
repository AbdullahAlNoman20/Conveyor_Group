import { lazy } from "react";

const WaiterDashboard = lazy(() => import("./pages/WaiterDashboard"));
const WaiterOrders = lazy(() => import("./pages/WaiterOrders"));

const WaiterRoutes = [
  { index: true, element: <WaiterDashboard /> },
  { path: "ready", element: <WaiterOrders view="ready" /> },
  { path: "assigned", element: <WaiterOrders view="assigned" /> },
  { path: "delivered", element: <WaiterOrders view="delivered" /> },
];

export default WaiterRoutes;