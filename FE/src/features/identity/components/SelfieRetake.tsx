import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../../../config/axios";
import { getApiErrorMessage } from "../../auth/utils/apiError";

export default function SelfieRetake({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    let stream: MediaStream | null = null;
    let cancelled = false;
    void navigator.mediaDevices?.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } }).then(value => {
      if (cancelled) { value.getTracks().forEach(track => track.stop()); return; }
      stream = value;
      if (video.current) { video.current.srcObject = value; void video.current.play().catch(() => setError("Không mở được camera. Hãy thử lại.")); }
    }).catch(() => { if (!cancelled) setError("Không mở được camera. Hãy cấp quyền camera trong trình duyệt."); });
    if (!navigator.mediaDevices) setError("Trình duyệt chưa hỗ trợ camera. Hãy mở website bằng HTTPS.");
    return () => { cancelled = true; mounted.current = false; stream?.getTracks().forEach(track => track.stop()); document.body.style.overflow = overflow; focus?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  async function capture() {
    const element = video.current;
    if (!element?.videoWidth || busy) return;
    setError("");
    const canvas = document.createElement("canvas");
    canvas.width = element.videoWidth; canvas.height = element.videoHeight;
    canvas.getContext("2d")?.drawImage(element, 0, 0);
    canvas.toBlob(blob => { if (blob && mounted.current) setPreview({ blob, url: URL.createObjectURL(blob) }); }, "image/jpeg", .95);
  }
  async function save() {
    if (!preview || busy) return;
    setBusy(true); setError("");
    try {
      const body = new FormData(); body.append("selfie", preview.blob, "selfie.jpg");
      await api.post("/identity/progress/selfie/replacement", body, { headers: { "Content-Type": undefined }, timeout: 130000 });
      await onSaved();
      if (mounted.current) onClose();
    } catch (e) { if (mounted.current) setError(getApiErrorMessage(e, "Selfie chưa khớp hoặc chưa đủ rõ. Hãy chụp lại; ảnh cũ vẫn được giữ.")); }
    finally { if (mounted.current) setBusy(false); }
  }
  return createPortal(<dialog ref={dialog} className="m-auto w-[calc(100%-24px)] max-w-xl rounded-3xl border-0 bg-white p-5 text-slate-800 shadow-xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-md" aria-labelledby="selfie-retake-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <div className="flex items-center justify-between gap-3"><h2 id="selfie-retake-title" className="text-lg font-bold">Chụp lại selfie</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Đóng camera selfie" className="h-11 w-11 rounded-xl border border-slate-200">✕</button></div>
    <p className="my-3 text-sm leading-6 text-slate-500">Nhìn thẳng, giữ đủ sáng. Selfie mới phải khớp phiên quét đã lưu. Ảnh quét mặt và CCCD được giữ nguyên.</p>
    <video ref={video} autoPlay playsInline muted onLoadedData={() => setReady(true)} className={`${preview ? "hidden" : "block"} max-h-[45dvh] w-full rounded-2xl bg-slate-900 object-contain`} />
    {preview && <img src={preview.url} alt="Selfie mới chụp" className="max-h-[45dvh] w-full rounded-2xl object-contain" />}
    {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-4 flex flex-wrap gap-3">{preview ? <><button type="button" disabled={busy} className="min-h-11 flex-1 rounded-xl border border-slate-200 px-4 font-bold" onClick={() => setPreview(null)}>Chụp lại</button><button type="button" disabled={busy} className="min-h-11 flex-1 rounded-xl bg-[#007f95] px-4 font-bold text-white disabled:opacity-50" onClick={() => void save()}>{busy ? "Đang kiểm tra…" : "Kiểm tra và lưu"}</button></> : <button type="button" disabled={!ready || busy} className="min-h-11 w-full rounded-xl bg-[#007f95] px-4 font-bold text-white disabled:opacity-50" onClick={() => void capture()}>Chụp selfie</button>}</div>
  </dialog>, document.body);
}
