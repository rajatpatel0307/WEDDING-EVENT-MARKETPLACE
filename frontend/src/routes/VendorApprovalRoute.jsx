import { Navigate, Outlet } from "react-router-dom";
import { useAuth, destination } from "../context/AuthContext";
export default function VendorApprovalRoute() {
  const { user } = useAuth();
  return user?.vendor?.verificationStatus === "Approved" ? (
    <Outlet />
  ) : (
    <Navigate to={destination(user)} replace />
  );
}
