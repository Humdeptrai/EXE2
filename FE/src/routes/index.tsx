import { createBrowserRouter, Navigate } from "react-router-dom";
import GuestRoute from "../components/guards/GuestRoute";
import ProtectedRoute from "../components/guards/ProtectedRoute";
import { privateRoutes } from "./privateRoutes";
import { publicRoutes } from "./publicRoutes";

import LandingPageRoute from "../features/landing/pages/LandingPageRoute";

export const router = createBrowserRouter([
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
