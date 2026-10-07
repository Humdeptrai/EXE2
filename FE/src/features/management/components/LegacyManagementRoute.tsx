import { Navigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
export default function LegacyManagementRoute() {
  const { user, isBootstrapping } = useAuth();
  if (isBootstrapping) return <p role="status">Đang kiểm tra phiên…</p>;
  return <Navigate to={user?.role === "ADMIN" ? "/admin" : user?.role === "STAFF" ? "/staff" : "/management/login"} replace />;
}
