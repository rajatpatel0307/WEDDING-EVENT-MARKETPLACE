import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, destination } from "../context/AuthContext";
import { canAccessVendorWorkspace } from "./authNavigation";
import VendorOnboardingPage from "../modules/vendor/pages/VendorOnboardingPage";
export default function VendorApprovalRoute() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (canAccessVendorWorkspace(user)) return <Outlet />;
  if (user?.role !== "Vendor")
    return <Navigate to={user ? destination(user) : "/auth/login"} replace />;
  // Vendors always land on their dashboard. Approval is still required for tools.
  if (pathname === "/vendor/dashboard") return <VendorOnboardingPage />;
  return <Navigate to="/vendor/dashboard" replace />;
}
