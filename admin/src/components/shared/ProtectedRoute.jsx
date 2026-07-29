import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Loader from "./Loader";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader full label="Checking your session..." />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
