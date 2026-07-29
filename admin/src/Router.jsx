import { createBrowserRouter, Navigate } from "react-router-dom";

import Root from "./Root";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import KitchenBoard from "./pages/Board/KitchenBoard";
import Unauthorized from "./components/shared/Unauthorized";
import RoleRoute from "./components/shared/RoleRoute";
import RouteErrorBoundary from "./components/shared/RouteErrorBoundary";
import { ROLES } from "./components/constants/roles";

// Each role's Layout + Routes are loaded together, on demand, via the data
// router's `lazy` route field — this is what actually splits the production
// bundle per role (a Client never downloads the Kitchen Head's queue code,
// etc.) instead of everything landing in one chunk.
function roleModule(allowedRole, layoutImport, routesImport) {
  return async () => {
    const [{ default: Layout }, { default: routes }] = await Promise.all([
      layoutImport(),
      routesImport(),
    ]);
    return {
      Component: () => (
        <RoleRoute allowedRoles={[allowedRole]}>
          <Layout />
        </RoleRoute>
      ),
      children: routes,
    };
  };
}

const Router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "unauthorized", element: <Unauthorized /> },
      { path: "kitchen/board", element: <KitchenBoard /> },

      {
        path: "app/super-admin",
        lazy: roleModule(
          ROLES.SUPER_ADMIN,
          () => import("./pages/modules/super-admin/layout/SuperAdminLayout"),
          () => import("./pages/modules/super-admin/SuperAdminRoutes")
        ),
      },
      {
        path: "app/manager",
        lazy: roleModule(
          ROLES.MANAGER,
          () => import("./pages/modules/manager/layout/ManagerLayout"),
          () => import("./pages/modules/manager/ManagerRoutes")
        ),
      },
      {
        path: "app/kitchen",
        lazy: roleModule(
          ROLES.KITCHEN_HEAD,
          () => import("./pages/modules/kitchen/layout/KitchenLayout"),
          () => import("./pages/modules/kitchen/KitchenRoutes")
        ),
      },
      {
        path: "app/waiter",
        lazy: roleModule(
          ROLES.WAITER,
          () => import("./pages/modules/waiter/layout/WaiterLayout"),
          () => import("./pages/modules/waiter/WaiterRoutes")
        ),
      },
      {
        path: "app/client",
        lazy: roleModule(
          ROLES.CLIENT,
          () => import("./pages/modules/client/layout/ClientLayout"),
          () => import("./pages/modules/client/ClientRoutes")
        ),
      },
      {
        path: "app/guest",
        lazy: roleModule(
          ROLES.GUEST,
          () => import("./pages/modules/guest/layout/GuestLayout"),
          () => import("./pages/modules/guest/GuestRoutes")
        ),
      },

      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default Router;
