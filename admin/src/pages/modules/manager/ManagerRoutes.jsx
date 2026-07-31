import { lazy } from "react";

const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const ScanQR = lazy(() => import("./pages/ScanQR"));
const NewOrder = lazy(() => import("./pages/NewOrder"));
const GuestManagement = lazy(() => import("./pages/GuestManagement"));
const GuestRequests = lazy(() => import("./pages/GuestRequests"));
const MealPlanner = lazy(() => import("./pages/MealPlanner"));
const WalletRecharge = lazy(() => import("./pages/WalletRecharge"));
const PurchaseVoucher = lazy(() => import("./pages/PurchaseVoucher"));
const ManagerKitchenQueue = lazy(() => import("./pages/ManagerKitchenQueue"));
const ManagerPreBookings = lazy(() => import("./pages/ManagerPreBookings"));
const ManagerReports = lazy(() => import("./pages/ManagerReports"));

const ManagerRoutes = [
  { index: true, element: <ManagerDashboard /> },
  { path: "scan-qr", element: <ScanQR /> },
  { path: "new-order", element: <NewOrder /> },
  { path: "kitchen-queue", element: <ManagerKitchenQueue /> },
  { path: "guests", element: <GuestManagement /> },
  { path: "guest-requests", element: <GuestRequests /> },
  { path: "meal-planner", element: <MealPlanner /> },
  { path: "pre-bookings", element: <ManagerPreBookings /> },
  { path: "wallet-recharge", element: <WalletRecharge /> },
  { path: "purchase", element: <PurchaseVoucher /> },
  { path: "reports", element: <ManagerReports /> },
];

export default ManagerRoutes;
