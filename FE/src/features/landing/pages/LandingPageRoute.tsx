import { lazy, Suspense } from "react";

const LandingPage = lazy(() => import("./LandingPage"));

export default function LandingPageRoute() {
  return (
    <>
    <link rel="preload" as="image" href="/images/handsfree-neighborhood-768.webp" media="(max-width: 600px)" fetchPriority="high" />
    <link rel="preload" as="image" href="/images/handsfree-neighborhood.webp" media="(min-width: 601px)" fetchPriority="high" />
    <Suspense fallback={<div className="min-h-screen bg-[#faf9f5]" role="status" aria-label="Đang tải HandsFree" />}>
      <LandingPage />
    </Suspense>
    </>
  );
}
