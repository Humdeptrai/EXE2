import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import "./identity-image-viewer.css";
export default function IdentityImageViewer({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: CSSProperties }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="hf-identity-image-trigger" aria-label={`Xem ảnh ${alt}`} onClick={() => setOpen(true)}><img src={src} alt={alt} className={className} style={style} /></button>
    {open && <Viewer src={src} alt={alt} close={() => setOpen(false)} />}</>;
}
export function Viewer({ src, alt, close }: { src: string; alt: string; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const distance = useRef(0);
  useEffect(() => {
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; dialog.current?.showModal();
    const element = dialog.current;
    return () => { element?.close(); document.body.style.overflow = overflow; focus?.focus({ preventScroll: true }); };
  }, []);
  function zoom(factor: number) { setView(v => { const scale = Math.max(1, Math.min(5, v.scale * factor)); return scale === 1 ? { scale, x: 0, y: 0 } : { ...v, scale }; }); }
  async function imageBlob() {
    const response = await fetch(src);
    if (!response.ok) throw new Error("Không tải được ảnh");
    return response.blob();
  }
  async function pngBlob() {
    const blob = await imageBlob();
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Không thể sao chép ảnh");
      context.drawImage(bitmap, 0, 0);
      return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Không thể chuyển ảnh")), "image/png"));
    } finally { bitmap.close(); }
  }
  async function action(copy: boolean) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      if (copy) {
        if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("Trình duyệt chưa hỗ trợ sao chép ảnh. Hãy chọn Lưu ảnh hoặc nhấn giữ ảnh để lưu.");
        // Start clipboard.write during the click gesture (required on Safari).
        await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob() })]);
        setMessage("Đã sao chép ảnh. Bạn có thể dán vào ứng dụng hỗ trợ hình ảnh.");
      } else {
        const blob = await imageBlob(); const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url;
        const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
        const name = alt.replace(/[\\/:*?"<>|]/g, "-").slice(0, 100) || "handsfree";
        a.download = /\.(png|jpe?g|webp)$/i.test(name) ? name : `${name}.${ext}`;
        document.body.appendChild(a); a.click(); a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30000);
        setMessage("Đã yêu cầu lưu ảnh. Nếu trình duyệt mở ảnh, hãy nhấn giữ để lưu vào máy.");
      }
    } catch (e) { setMessage(copy ? (e instanceof Error && e.message.startsWith("Trình duyệt") ? e.message : "Không thể sao chép ảnh. Hãy cấp quyền clipboard hoặc chọn Lưu ảnh.") : "Không thể lưu ảnh. Hãy thử nhấn giữ / chuột phải trên ảnh hoặc tải lại."); }
    finally { setBusy(false); }
  }
  return createPortal(<dialog ref={dialog} className="hf-identity-viewer" aria-label={alt} onCancel={e => { e.preventDefault(); close(); }}>
    <header><strong>{alt}</strong><div><button type="button" aria-label="Thu nhỏ" disabled={view.scale <= 1} onClick={() => zoom(1 / 1.25)}>−</button><select aria-label="Mức phóng to" value={view.scale} onChange={e => { const scale = Number(e.target.value); setView(v => scale === 1 ? { scale, x: 0, y: 0 } : { ...v, scale }); }}>
      {[...new Set([1, 1.25, 1.5, 2, 3, 4, 5, view.scale])].sort((a, b) => a - b).map(scale => <option key={scale} value={scale}>{Math.round(scale * 100)}%</option>)}
    </select><button type="button" aria-label="Phóng to" disabled={view.scale >= 5} onClick={() => zoom(1.25)}>+</button><button type="button" aria-label="Đóng ảnh" onClick={close}>✕</button></div></header>
    <div className="hf-image-actions"><button type="button" disabled={busy || failed} onClick={() => void action(false)}>↓ Lưu ảnh</button><button type="button" disabled={busy || failed} onClick={() => void action(true)}>▣ Sao chép ảnh</button><span role="status">{busy ? "Đang xử lý ảnh…" : message}</span></div>
    <div className="hf-identity-viewer-stage" onWheel={e => zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1)}
      onPointerDown={e => { if (e.button !== 0) return; pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; distance.current = Math.hypot(a.x - b.x, a.y - b.y); } }}
      onPointerMove={e => { const previous = pointers.current.get(e.pointerId); if (!previous) return; pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; const next = Math.hypot(a.x - b.x, a.y - b.y); if (distance.current > 0) zoom(next / distance.current); distance.current = next; } else { setView(v => v.scale > 1 ? { ...v, x: v.x + e.clientX - previous.x, y: v.y + e.clientY - previous.y } : v); } }}
      onPointerUp={e => { pointers.current.delete(e.pointerId); distance.current = 0; }} onPointerCancel={e => { pointers.current.delete(e.pointerId); distance.current = 0; }}>
      <img src={src} alt={alt} onError={() => setFailed(true)} draggable={false} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }} />
    </div>{failed && <p role="alert">Không tải được ảnh. Vui lòng đóng và thử lại.</p>}<p>Cuộn hoặc chụm hai ngón để zoom · Kéo để xem ảnh · Escape để đóng</p>
  </dialog>, document.body);
}
