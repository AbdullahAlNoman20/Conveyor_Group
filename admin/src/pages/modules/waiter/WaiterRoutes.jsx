import WaiterDashboard from "./pages/WaiterDashboard";
import WaiterOrders from "./pages/WaiterOrders";

const WaiterRoutes = [
  { index: true, element: <WaiterDashboard /> },
  { path: "ready", element: <WaiterOrders /> },
  { path: "assigned", element: <WaiterOrders /> },
  { path: "delivered", element: <WaiterOrders /> },
];

export default WaiterRoutes;
