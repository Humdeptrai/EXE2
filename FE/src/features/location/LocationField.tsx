import { lazy, Suspense, useState } from "react";
import { emptyPlace, type Place } from "./locationService";
import "./location.css";
const AddressPicker = lazy(() => import("./AddressPicker"));
export default function LocationField({ value, onChange, disabled = false, title = "Chọn địa điểm", fallback = "" }: { value?: Place | null; onChange: (place: Place) => void; disabled?: boolean; title?: string; fallback?: string }) {
  const [open, setOpen] = useState(false);
  return <div className="hf-location-field"><button type="button" disabled={disabled} onClick={() => setOpen(true)}><span aria-hidden="true">⌖</span><span>{value?.address || fallback || title}</span><b>Chọn</b></button>{value && <small>{value.area} · {value.latitude != null ? "Đã chọn ghim" : "Địa chỉ nhập tay"}</small>}
    {open && <Suspense fallback={<p role="status">Đang mở bộ chọn địa chỉ…</p>}><AddressPicker title={title} initial={value || { ...emptyPlace, address: fallback }} onClose={() => setOpen(false)} onSelect={p => { onChange(p); setOpen(false); }} /></Suspense>}
  </div>;
}
