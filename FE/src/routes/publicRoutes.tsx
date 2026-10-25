import { lazy } from "react";
const PasswordRecoveryPage = lazy(() => import("../features/auth/pages/PasswordRecoveryPage"));
const LoginPage = lazy(() => import("../features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("../features/auth/pages/RegisterPage"));

export const publicRoutes = [
  { path: "login", element: <LoginPage /> },
  { path: "register", element: <RegisterPage /> },
];

// Recovery links must also work while another account is signed in.
export const passwordRecoveryRoutes = [
  { path: "/forgot-password", element: <PasswordRecoveryPage /> },
  { path: "/reset-password", element: <PasswordRecoveryPage reset /> },
];
