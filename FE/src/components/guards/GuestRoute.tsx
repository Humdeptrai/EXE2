import { onboardingUrl } from "../../services/identityService";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function GuestRoute() {
  const location = useLocation();
  const { user, isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f8ff] font-bold text-[#006b82]">Đang kiểm tra phiên đăng nhập...</div>;
  }

  return isAuthenticated ? <Navigate to={user?.role === "ADMIN" ? "/admin" : user?.role === "STAFF" ? "/staff" : onboardingUrl(location.state?.from)} replace /> : <Outlet />;
}
