import { lazy } from "react";

const KitchenDashboard = lazy(() => import("./pages/KitchenDashboard"));
const KitchenQueue = lazy(() => import("./pages/KitchenQueue"));
const DemandForecast = lazy(() => import("./pages/DemandForecast"));
const TomorrowPlanning = lazy(() => import("./pages/TomorrowPlanning"));

const KitchenRoutes = [
  { index: true, element: <KitchenDashboard /> },
  { path: "queue", element: <KitchenQueue /> },
  { path: "preparation", element: <KitchenQueue /> },
  { path: "delays", element: <KitchenQueue /> },
  { path: "demand-forecast", element: <DemandForecast /> },
  { path: "tomorrow", element: <TomorrowPlanning /> },
];

export default KitchenRoutes;
