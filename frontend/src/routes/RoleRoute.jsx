import { Navigate, Outlet } from "react-router-dom";
import { useAuth, destination } from "../context/AuthContext";
export default function RoleRoute({ role }) {
  const { user } = useAuth();
  return user?.role === role ? (
    <Outlet />
  ) : (
    <Navigate to={user ? destination(user) : "/auth/login"} replace />
  );
}
