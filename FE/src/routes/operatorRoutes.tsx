import OperatorGuard from "../features/management/components/OperatorGuard";
import OperatorShell from "../features/management/components/OperatorShell";
import OperatorLoginPage from "../features/management/pages/OperatorLoginPage";
import OperatorDashboard from "../features/management/pages/OperatorDashboard";
import ManagementPage from "../features/management/pages/ManagementPage";

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
      ...(role === "ADMIN" ? [{ path: "revenue", element: <OperatorDashboard revenueOnly /> }] : []),
      ...panels.map((panel) => ({ path: panel, element: <ManagementPage key={panel} panel={panel} /> })),
    ] }] },
  ];
}),
];
