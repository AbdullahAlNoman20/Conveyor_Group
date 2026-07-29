import KitchenDashboard from "./pages/KitchenDashboard";
import KitchenQueue from "./pages/KitchenQueue";
import DemandForecast from "./pages/DemandForecast";
import TomorrowPlanning from "./pages/TomorrowPlanning";

const KitchenRoutes = [
  { index: true, element: <KitchenDashboard /> },
  { path: "queue", element: <KitchenQueue /> },
  { path: "preparation", element: <KitchenQueue /> },
  { path: "delays", element: <KitchenQueue /> },
  { path: "demand-forecast", element: <DemandForecast /> },
  { path: "tomorrow", element: <TomorrowPlanning /> },
];

export default KitchenRoutes;
