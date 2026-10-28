import { Navigate, Outlet } from "react-router-dom";
import { useAuth, destination } from "../context/AuthContext";
export default function GuestRoute() {
  const { user, loading } = useAuth();
  return loading ? (
    <div className="loading-page h-[100dvh] grid place-items-center [color:#98767f] [font-family:Georgia,_serif] text-[22px]" role="status">
      Preparing your space…
    </div>
  ) : user ? (
    <Navigate to={destination(user)} replace />
  ) : (
    <Outlet />
  );
}
