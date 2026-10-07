import { Navigate, useLocation } from "react-router-dom";

export default function LegacyOperatorLogin() {
  const location = useLocation();
  return <Navigate to="/management/login" replace state={location.state} />;
}
