import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function ProtectedRoute() {
  const location = useLocation();
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div
        className="loading-page h-[100dvh] grid place-items-center [color:#98767f] [font-family:Georgia,_serif] text-[22px]"
        role="status"
      >
        Preparing your space…
      </div>
    );
  return user && user.accountStatus === "Active" ? (
    <Outlet />
  ) : (
    <Navigate
      to={
        location.pathname.startsWith("/customer/")
          ? `/auth/login?redirect=${encodeURIComponent(location.pathname + location.search)}`
          : "/auth/login"
      }
      replace
    />
  );
}
