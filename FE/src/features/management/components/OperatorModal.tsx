import { type PropsWithChildren, useEffect, useRef } from "react";
import { AppIcon } from "../../../components/ui/AppIcon";

export default function OperatorModal({ title, onClose, children }: PropsWithChildren<{ title: string; onClose: () => void }>) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]') || []);
    (focusable()[0] || ref.current)?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); }
      if (e.key === "Tab") {
        const nodes = focusable(); const first = nodes[0], last = nodes[nodes.length - 1];
        if (!nodes.length) { e.preventDefault(); return; }
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", key); prior?.focus(); };
  }, []);
  return <div className="op-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div ref={ref} className="op-root op-modal" role="dialog" aria-modal="true" aria-labelledby="op-modal-title" tabIndex={-1}><header><h2 id="op-modal-title">{title}</h2><button className="op-icon-button" aria-label="Đóng" onClick={onClose}><AppIcon name="close" className="op-icon" /></button></header>{children}</div></div>;
}
