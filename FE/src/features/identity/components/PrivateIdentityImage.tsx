import { useEffect, useState } from "react";
import api from "../../../config/axios";
export default function PrivateIdentityImage({ path, alt }: { path: string; alt: string }) {
  const [image, setImage] = useState<{ path: string; url: string } | null>(null);
  const [failed, setFailed] = useState("");
  useEffect(() => {
    const controller = new AbortController(); let url = "";
    void api.get(path, { responseType: "blob", signal: controller.signal }).then(r => {
      if (!controller.signal.aborted) { url = URL.createObjectURL(r.data); setImage({ path, url }); }
    }).catch(() => { if (!controller.signal.aborted) setFailed(path); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [path]);
  return image?.path === path ? <img src={image.url} alt={alt} className="h-28 w-24 rounded-xl object-contain bg-slate-50" /> : <p className="text-xs text-slate-500" role="status">{failed === path ? "Không tải được ảnh. Vui lòng tải lại trang." : "Đang tải ảnh…"}</p>;
}
