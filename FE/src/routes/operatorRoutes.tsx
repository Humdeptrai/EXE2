import { lazy } from "react";
const ProfileSkillManagementPage = lazy(() => import("../features/management/pages/ProfileSkillManagementPage"));
const IdentityReviewPage = lazy(() => import("../features/management/pages/IdentityReviewPage"));
import OperatorGuard from "../features/management/components/OperatorGuard";
import OperatorShell from "../features/management/components/OperatorShell";
const OperatorLoginPage = lazy(() => import("../features/management/pages/OperatorLoginPage"));
const OperatorDashboard = lazy(() => import("../features/management/pages/OperatorDashboard"));
const ReportManagementPage = lazy(() => import("../features/management/pages/ReportManagementPage"));
const ManagementPage = lazy(() => import("../features/management/pages/ManagementPage"));

import LegacyOperatorLogin from "../features/management/components/LegacyOperatorLogin";

export const operatorRoutes = [
  { path: "/management/login", element: <OperatorLoginPage /> },
  { path: "/admin/login", element: <LegacyOperatorLogin /> },
  { path: "/staff/login", element: <LegacyOperatorLogin /> },
  ...(["ADMIN", "STAFF"] as const).flatMap((role) => {
  const base = role === "ADMIN" ? "admin" : "staff";
  const panels = role === "ADMIN" ? ["reports", "jobs", "users", "matches", "topups", "ledger", "settings", "audit"] : ["reports", "jobs"];
  return [
    { element: <OperatorGuard role={role} />, children: [{ path: `/${base}`, element: <OperatorShell />, children: [
      { index: true, element: <OperatorDashboard /> },
      { path: "identities", element: <IdentityReviewPage /> },
      ...(role === "ADMIN" ? [{ path: "revenue", element: <OperatorDashboard revenueOnly /> }, { path: "skills", element: <ProfileSkillManagementPage /> }] : []),
      ...panels.map((panel) => ({ path: panel, element: panel === "reports" ? <ReportManagementPage /> : <ManagementPage key={panel} panel={panel} /> })),
    ] }] },
  ];
}),
];
