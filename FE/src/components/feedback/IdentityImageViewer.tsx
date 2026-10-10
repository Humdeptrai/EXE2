import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import "./identity-image-viewer.css";
export default function IdentityImageViewer({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: CSSProperties }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="hf-identity-image-trigger" aria-label={`Xem ảnh ${alt}`} onClick={() => setOpen(true)}><img src={src} alt={alt} className={className} style={style} /></button>
    {open && <Viewer src={src} alt={alt} close={() => setOpen(false)} />}</>;
}
function Viewer({ src, alt, close }: { src: string; alt: string; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
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
  return createPortal(<dialog ref={dialog} className="hf-identity-viewer" aria-label={alt} onCancel={e => { e.preventDefault(); close(); }}>
    <header><strong>{alt}</strong><div><button aria-label="Thu nhỏ" disabled={view.scale <= 1} onClick={() => zoom(1 / 1.25)}>−</button><span>{Math.round(view.scale * 100)}%</span><button aria-label="Phóng to" disabled={view.scale >= 5} onClick={() => zoom(1.25)}>+</button><button onClick={() => setView({ scale: 1, x: 0, y: 0 })}>Đặt lại</button><button aria-label="Đóng ảnh" onClick={close}>✕</button></div></header>
    <div className="hf-identity-viewer-stage" onWheel={e => zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1)}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; distance.current = Math.hypot(a.x - b.x, a.y - b.y); } }}
      onPointerMove={e => { const previous = pointers.current.get(e.pointerId); if (!previous) return; pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; const next = Math.hypot(a.x - b.x, a.y - b.y); if (distance.current > 0) zoom(next / distance.current); distance.current = next; } else { setView(v => v.scale > 1 ? { ...v, x: v.x + e.clientX - previous.x, y: v.y + e.clientY - previous.y } : v); } }}
      onPointerUp={e => { pointers.current.delete(e.pointerId); distance.current = 0; }} onPointerCancel={e => { pointers.current.delete(e.pointerId); distance.current = 0; }}>
      <img src={src} alt={alt} draggable={false} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }} />
    </div><p>Cuộn hoặc chụm hai ngón để zoom. Kéo để xem ảnh khi phóng to.</p>
  </dialog>, document.body);
}
