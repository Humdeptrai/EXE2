import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

export default function OperatorGuard({ role }: { role: "ADMIN" | "STAFF" }) {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();
  if (isBootstrapping) return <div className="op-loading" role="status">Đang kiểm tra phiên đăng nhập…</div>;
  if (!user) return <Navigate to="/management/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to="/management/login" replace />;
  return <Outlet />;
}
