import { Navigate, Outlet } from "react-router-dom";
import { useAuth, destination } from "../context/AuthContext";
export default function GuestRoute() {
  const { user, loading } = useAuth();
  return loading ? (
    <div className="loading-page" role="status">
      Preparing your space…
    </div>
  ) : user ? (
    <Navigate to={destination(user)} replace />
  ) : (
    <Outlet />
  );
}
