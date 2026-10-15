import { lazy, Suspense, useState } from "react";
import type { Place } from "./locationService";
const LocationMap = lazy(() => import("./LocationMap"));
export default function LocationPreview({ place }: { place: Place }) {
  const [open, setOpen] = useState(false);
  if (place.latitude == null || place.longitude == null) return null;
  return <section className="min-w-0"><button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="mb-3 min-h-11 rounded-xl border border-[#cfe4e9] bg-[#eff8fa] px-4 text-sm font-bold text-[#007f95]">{open ? "Ẩn bản đồ" : "Xem vị trí công việc trên bản đồ"}</button>{open && <Suspense fallback={<p role="status">Đang mở bản đồ…</p>}><LocationMap place={place} /></Suspense>}</section>;
}
