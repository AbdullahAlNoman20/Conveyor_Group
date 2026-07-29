import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Loader from "./Loader";

/**
 * Front-end RBAC gate (SRS Section 27). Front-end enforcement alone is never
 * sufficient — the real backend must re-check every one of these roles on
 * every request (SRS Section 28.1) once a server exists.
 */
export default function RoleRoute({ allowedRoles = [], children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader full label="Checking your session..." />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}
