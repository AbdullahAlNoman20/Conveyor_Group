import ManagerDashboard from "./pages/ManagerDashboard";
import ScanQR from "./pages/ScanQR";
import NewOrder from "./pages/NewOrder";
import GuestManagement from "./pages/GuestManagement";
import GuestRequests from "./pages/GuestRequests";
import MealPlanner from "./pages/MealPlanner";
import WalletRecharge from "./pages/WalletRecharge";
import PurchaseVoucher from "./pages/PurchaseVoucher";
import ManagerKitchenQueue from "./pages/ManagerKitchenQueue";
import ManagerPreBookings from "./pages/ManagerPreBookings";
import ManagerReports from "./pages/ManagerReports";

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
