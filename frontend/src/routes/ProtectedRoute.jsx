import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="loading-page h-[100dvh] grid place-items-center [color:#98767f] [font-family:Georgia,_serif] text-[22px]" role="status">
        Preparing your space…
      </div>
    );
  return user && user.accountStatus === "Active" ? (
    <Outlet />
  ) : (
    <Navigate to="/auth/login" replace />
  );
}
