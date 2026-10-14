import { useEffect, useRef, useState } from "react";
import "./revenue.css";
export default function MonthPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return <div className="op-month-picker" ref={root} onKeyDown={e => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} className="op-button secondary" aria-label="Chọn tháng thống kê" aria-expanded={open} onClick={() => { setYear(Number(value.slice(0, 4))); setOpen(v => !v); }}>▦ Tháng {Number(value.slice(5))}/{value.slice(0, 4)} <span aria-hidden="true">⌄</span></button>
    {open && <div className="op-month-popover" role="group" aria-label="Chọn tháng và năm"><header><button aria-label="Năm trước" disabled={year <= 2000} onClick={() => setYear(v => v - 1)}>‹</button><strong>{year}</strong><button aria-label="Năm sau" disabled={year >= 2100} onClick={() => setYear(v => v + 1)}>›</button></header><div className="op-month-grid">{Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`).map((month, i) => <button key={month} aria-pressed={value === month} className={value === month ? "selected" : ""} onClick={() => { onChange(month); setOpen(false); trigger.current?.focus(); }}>Tháng {i + 1}</button>)}</div></div>}
  </div>;
}
