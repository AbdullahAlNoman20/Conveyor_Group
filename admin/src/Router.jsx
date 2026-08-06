import { createBrowserRouter, Navigate } from "react-router-dom";

import Root from "./Root";
import Home from "./pages/Home/Home";
import MenuDetail from "./pages/Menu/MenuDetail";
import Login from "./pages/Login/Login";
import KitchenBoard from "./pages/Board/KitchenBoard";
import Unauthorized from "./components/shared/Unauthorized";
import RoleRoute from "./components/shared/RoleRoute";
import RouteErrorBoundary from "./components/shared/RouteErrorBoundary";
import { ROLES } from "./components/constants/roles";

import SuperAdminLayout from "./pages/modules/super-admin/layout/SuperAdminLayout";
import SuperAdminRoutes from "./pages/modules/super-admin/SuperAdminRoutes";
import ManagerLayout from "./pages/modules/manager/layout/ManagerLayout";
import ManagerRoutes from "./pages/modules/manager/ManagerRoutes";
import KitchenLayout from "./pages/modules/kitchen/layout/KitchenLayout";
import KitchenRoutes from "./pages/modules/kitchen/KitchenRoutes";
import WaiterLayout from "./pages/modules/waiter/layout/WaiterLayout";
import WaiterRoutes from "./pages/modules/waiter/WaiterRoutes";
import ClientLayout from "./pages/modules/client/layout/ClientLayout";
import ClientRoutes from "./pages/modules/client/ClientRoutes";
import GuestLayout from "./pages/modules/guest/layout/GuestLayout";
import GuestRoutes from "./pages/modules/guest/GuestRoutes";

// IMPORTANT: react-router's `lazy` route field can only return
// Component/loader/action/etc — it CANNOT define `children` (path-matching
// fields must be known synchronously so the router can match a URL at all).
// Route trees (children arrays) are therefore static here. Code-splitting
// still happens — just at the individual PAGE level inside each *Routes.jsx
// file (see React.lazy() there), not at the route-tree level.
const Router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Home /> },
      { path: "menu/:id", element: <MenuDetail /> },
      { path: "login", element: <Login /> },
      { path: "unauthorized", element: <Unauthorized /> },
      { path: "kitchen/board", element: <KitchenBoard /> },

      {
        path: "app/super-admin",
        element: (
          <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
            <SuperAdminLayout />
          </RoleRoute>
        ),
        children: SuperAdminRoutes,
      },
      {
        path: "app/manager",
        element: (
          <RoleRoute allowedRoles={[ROLES.MANAGER]}>
            <ManagerLayout />
          </RoleRoute>
        ),
        children: ManagerRoutes,
      },
      {
        path: "app/kitchen",
        element: (
          <RoleRoute allowedRoles={[ROLES.KITCHEN_HEAD]}>
            <KitchenLayout />
          </RoleRoute>
        ),
        children: KitchenRoutes,
      },
      {
        path: "app/waiter",
        element: (
          <RoleRoute allowedRoles={[ROLES.WAITER]}>
            <WaiterLayout />
          </RoleRoute>
        ),
        children: WaiterRoutes,
      },
      {
        path: "app/client",
        element: (
          <RoleRoute allowedRoles={[ROLES.CLIENT]}>
            <ClientLayout />
          </RoleRoute>
        ),
        children: ClientRoutes,
      },
      {
        path: "app/guest",
        element: (
          <RoleRoute allowedRoles={[ROLES.GUEST]}>
            <GuestLayout />
          </RoleRoute>
        ),
        children: GuestRoutes,
      },

      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default Router;
