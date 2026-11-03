import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, destination } from "../context/AuthContext";
import { canAccessVendorPage } from "./authNavigation";
export default function VendorApprovalRoute() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (canAccessVendorPage(user, pathname)) return <Outlet />;
  return (
    <Navigate
      to={
        user?.role === "Vendor"
          ? "/vendor/verification"
          : user
            ? destination(user)
            : "/auth/login"
      }
      replace
    />
  );
}
