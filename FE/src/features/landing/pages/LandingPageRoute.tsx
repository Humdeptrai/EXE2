import { lazy, Suspense } from "react";

const LandingPage = lazy(() => import("./LandingPage"));

export default function LandingPageRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf9f5]" role="status" aria-label="Đang tải HandsFree" />}>
      <LandingPage />
    </Suspense>
  );
}
