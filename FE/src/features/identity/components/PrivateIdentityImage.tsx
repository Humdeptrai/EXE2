import { useEffect, useRef, useState } from "react";
import IdentityImageViewer from "../../../components/feedback/IdentityImageViewer";
import { privateMedia } from "../../../services/privateMediaCache";
export default function PrivateIdentityImage({ path, alt }: { path: string; alt: string }) {
  const [image, setImage] = useState<{ path: string; url: string } | null>(null);
  const [failed, setFailed] = useState("");
  const [retry, setRetry] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true; let url = ""; let started = false;
    const load = () => {
      if (started) return; started = true;
      void privateMedia(path).then(blob => {
        if (active) { url = URL.createObjectURL(blob); setImage({ path, url }); }
      }).catch(() => { if (active) setFailed(path); });
    };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { load(); observer.disconnect(); }
    }, { rootMargin: "120px" });
    if (wrapper.current) observer.observe(wrapper.current);
    return () => { active = false; observer.disconnect(); if (url) URL.revokeObjectURL(url); };
  }, [path, retry]);
  return <div ref={wrapper} className="min-h-28">
    {image?.path === path ? <IdentityImageViewer src={image.url} alt={alt} className="h-28 w-24 rounded-xl object-contain bg-slate-50" />
      : failed === path ? <button type="button" className="min-h-11 text-xs font-bold text-[#007f95]" onClick={() => { setFailed(""); setRetry(value => value + 1); }}>Không tải được ảnh · Thử lại</button>
      : <p className="text-xs text-slate-500" role="status">Đang tải ảnh…</p>}
  </div>;
}
