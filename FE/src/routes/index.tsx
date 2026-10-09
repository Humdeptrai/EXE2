import InstallPage from "../features/pwa/InstallPage";
import { createBrowserRouter, Navigate } from "react-router-dom";
import GuestRoute from "../components/guards/GuestRoute";
import ProtectedRoute from "../components/guards/ProtectedRoute";
import { privateRoutes } from "./privateRoutes";
import { publicRoutes } from "./publicRoutes";

import { operatorRoutes } from "./operatorRoutes";
import LegacyManagementRoute from "../features/management/components/LegacyManagementRoute";

import LandingPageRoute from "../features/landing/pages/LandingPageRoute";

export const router = createBrowserRouter([
  { path: "/install", element: <InstallPage /> },
  ...operatorRoutes,
  { path: "/management", element: <LegacyManagementRoute /> },
  {
    path: "/",
    element: <LandingPageRoute />,
  },
  {
    element: <GuestRoute />,
    children: publicRoutes,
  },
  {
    element: <ProtectedRoute />,
    children: privateRoutes,
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
