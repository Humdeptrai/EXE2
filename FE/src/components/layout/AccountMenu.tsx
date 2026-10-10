import { useEffect, useId, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AppIcon } from "../ui/AppIcon";

export default function AccountMenu({ avatar }: { avatar: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLAnchorElement>("nav a")?.focus();
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  const links = [
    { to: "/profile", label: "Xem hồ sơ", icon: "user" as const },
    { to: "/face-comparison", label: "Xác minh danh tính", icon: "check" as const },
    { to: "/reports", label: "Báo cáo của tôi", icon: "list" as const },
  ];
  return <div ref={root} className="hf-account-menu" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
    <button ref={trigger} type="button" className="hf-account-menu-trigger" aria-label="Mở menu tài khoản" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>{avatar}</button>
    {open && <section id={id} className="hf-account-menu-panel" aria-label="Tài khoản của bạn">
      <div className="hf-account-menu-heading"><strong>{user?.fullName || "Tài khoản của bạn"}</strong><span>{user?.email || user?.phone}</span></div>
      <nav aria-label="Menu tài khoản">{links.map(item => <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}><AppIcon name={item.icon} className="h-5 w-5" />{item.label}</NavLink>)}</nav>
      <button type="button" className="hf-account-menu-logout" onClick={() => { setOpen(false); void logout(); }}><AppIcon name="logout" className="h-5 w-5" />Đăng xuất</button>
    </section>}
  </div>;
}
