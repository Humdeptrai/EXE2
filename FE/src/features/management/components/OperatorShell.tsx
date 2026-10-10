import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { AppIcon } from "../../../components/ui/AppIcon";
import "../operator.css";
import "../operator-refactor.css";

const items = [
  { path: "", title: "Tổng quan", icon: "home" as const, group: "Tổng quan" },
  { path: "reports", title: "Báo cáo", icon: "bell" as const, group: "Quản lý" },
  { path: "jobs", title: "Bài đăng", icon: "briefcase" as const },
  { path: "identities", title: "Hồ sơ xác thực", icon: "users" as const },
  { path: "users", title: "Tài khoản", icon: "users" as const, admin: true },
  { path: "matches", title: "Kết nối", icon: "chat" as const, admin: true },
  { path: "revenue", title: "Doanh thu", icon: "star" as const, admin: true, group: "Tài chính" },
  { path: "topups", title: "Đơn nạp tiền", icon: "list" as const, admin: true },
  { path: "ledger", title: "Sổ giao dịch ví", icon: "bookmark" as const, admin: true },
  { path: "settings", title: "Phí & thời gian", icon: "filter" as const, admin: true, group: "Cấu hình" },
  { path: "audit", title: "Nhật ký quản trị", icon: "clock" as const, admin: true },
];

export default function OperatorShell() {
  const { user, logout } = useAuth();
  const admin = user?.role === "ADMIN";
  const base = admin ? "/admin" : "/staff";
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const current = items.find((i) => location.pathname === `${base}${i.path ? `/${i.path}` : ""}`);
  useEffect(() => {
    function close(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);
  async function signOut() {
    try { await logout(); } finally { navigate("/management/login", { replace: true }); }
  }
  return <div className={`op-root ${open ? "op-nav-open" : ""}`}>
    <a className="op-skip" href="#operator-content">Đến nội dung</a>
    {open && <button className="op-backdrop" aria-label="Đóng điều hướng" onClick={() => setOpen(false)} />}
    <aside className="op-sidebar">
      <NavLink to={base} end className="op-brand" onClick={() => setOpen(false)}><span className="op-brand-mark">H<span>↗</span></span><span>HandsFree<small>{admin ? "ADMIN WORKSPACE" : "STAFF WORKSPACE"}</small></span></NavLink>
      <div className="op-workspace-label"><span className="op-online-dot" />{admin ? "Trung tâm quản trị" : "Trung tâm kiểm duyệt"}</div>
      <nav aria-label="Điều hướng quản trị">{items.filter((i) => admin || !i.admin).map((i) => <div key={i.path}>
        {i.group && <p className="op-nav-group">{i.group}</p>}
        <NavLink end to={`${base}${i.path ? `/${i.path}` : ""}`} onClick={() => setOpen(false)} className={({ isActive }) => `op-nav-item ${isActive ? "active" : ""}`}><AppIcon name={i.icon} className="op-icon" /><span>{i.title}</span></NavLink>
      </div>)}</nav>
      <div className="op-sidebar-footer"><div className="op-avatar">{user?.fullName?.charAt(0) || "H"}</div><div><strong>{user?.fullName}</strong><small>{admin ? "Quản trị viên" : "Nhân viên hỗ trợ"}</small></div><button title="Đăng xuất" aria-label="Đăng xuất" onClick={() => void signOut()}><AppIcon name="logout" className="op-icon" /></button></div>
    </aside>
    <div className="op-main"><header className="op-topbar"><div className="op-topbar-left"><button className="op-menu-button" aria-label="Mở điều hướng" aria-expanded={open} onClick={() => setOpen(!open)}><AppIcon name="menu" className="op-icon" /></button><span>Không gian {admin ? "quản trị" : "hỗ trợ"}<b> / </b><strong>{current?.title || "Tổng quan"}</strong></span></div><div className="op-topbar-right"><span className="op-role-badge">{admin ? "ADMIN" : "STAFF"}</span><span className="op-avatar small">{user?.fullName?.charAt(0) || "H"}</span></div></header>
      <main id="operator-content" className="op-content"><Outlet /></main>
      <footer className="op-footer">HandsFree · Không gian vận hành</footer>
    </div>
  </div>;
}
