import { lazy } from "react";

const WaiterDashboard = lazy(() => import("./pages/WaiterDashboard"));
const WaiterOrders = lazy(() => import("./pages/WaiterOrders"));

const WaiterRoutes = [
  { index: true, element: <WaiterDashboard /> },
  { path: "ready", element: <WaiterOrders /> },
  { path: "assigned", element: <WaiterOrders /> },
  { path: "delivered", element: <WaiterOrders /> },
];

export default WaiterRoutes;
