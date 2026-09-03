import { createBrowserRouter, Navigate } from "react-router-dom";

import Root from "./Root";
import Home from "./pages/Home/Home";
import MenuDetail from "./pages/Menu/MenuDetail";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import KitchenBoard from "./pages/Board/KitchenBoard";
import Unauthorized from "./components/shared/Unauthorized";
import RoleRoute from "./components/shared/RoleRoute";
import RouteErrorBoundary from "./components/shared/RouteErrorBoundary";
import { ROLES } from "./components/constants/roles";

import SuperAdminLayout from "./pages/modules/super-admin/layout/SuperAdminLayout";
import SuperAdminRoutes from "./pages/modules/super-admin/SuperAdminRoutes";
import ManagerLayout from "./pages/modules/manager/layout/ManagerLayout";
import ManagerRoutes from "./pages/modules/manager/ManagerRoutes";
import ClientLayout from "./pages/modules/client/layout/ClientLayout";
import ClientRoutes from "./pages/modules/client/ClientRoutes";

const Router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Home /> },
      { path: "menu/:id", element: <MenuDetail /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
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
        path: "app/client",
        element: (
          <RoleRoute allowedRoles={[ROLES.CLIENT]}>
            <ClientLayout />
          </RoleRoute>
        ),
        children: ClientRoutes,
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default Router;
