import UserNotice from "../../../components/feedback/UserNotice";
import { type FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import { AppIcon } from "../../../components/ui/AppIcon";
import "../operator.css";

export default function OperatorLoginPage() {
  const { user, loginOperator, logout, isBootstrapping } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  function destinationFor(role: "ADMIN" | "STAFF") {
    const base = role === "ADMIN" ? "/admin" : "/staff";
    return from?.startsWith(`${base}/`) && from !== `${base}/login` ? from : base;
  }
  const from = (location.state as { from?: string } | null)?.from;
  if (isBootstrapping) return <div className="op-loading">Đang kiểm tra phiên…</div>;
  if (user?.role === "ADMIN" || user?.role === "STAFF") return <Navigate to={destinationFor(user.role)} replace />;
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      const account = await loginOperator({ identifier: email.trim(), password });
      if (account.role === "ADMIN" || account.role === "STAFF") navigate(destinationFor(account.role), { replace: true });
    }
    catch (err) { setError(getApiErrorMessage(err, "Không thể đăng nhập vào khu vực này.")); }
    finally { setBusy(false); }
  }
  return <div className="op-root op-login">
    <section className="op-login-visual"><Link to="/" className="op-brand"><span className="op-brand-mark">H↗</span><span>HandsFree<small>OPERATIONS WORKSPACE</small></span></Link>
      <div className="op-login-copy"><span className="op-pill">Vận hành HandsFree</span><h1><>Một không gian.<br />Kết nối cả đội ngũ.</></h1><p>Dành cho quản trị viên và nhân viên hỗ trợ. Công cụ làm việc được hiển thị theo quyền của tài khoản.</p>
        <div className="op-login-art" aria-hidden="true"><div className="op-art-card"><AppIcon name="star" className="op-art-icon" /><div className="op-art-line" /><div className="op-art-bars">{[35, 65, 48, 80, 60, 95, 75].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div></div><div className="op-art-float"><AppIcon name="check" className="op-icon" />Sẵn sàng vận hành</div></div>
      </div><small className="op-login-footnote">HandsFree · Kết nối từ những việc nhỏ</small>
    </section>
    <section className="op-login-form-panel"><div className="op-login-box"><span className="op-role-badge">MANAGEMENT PORTAL</span><h2>Chào mừng trở lại</h2><p>Đăng nhập bằng tài khoản ADMIN hoặc STAFF.</p>
      {user ? <div className="op-notice"><p>Bạn đang đăng nhập bằng tài khoản {user.email || user.fullName} ({user.role}). Hãy đăng xuất để đổi tài khoản.</p><button className="op-button" onClick={() => { void logout().catch(() => undefined); }}>Đăng xuất tài khoản hiện tại</button></div> : <form onSubmit={submit}>
        <label>Email<input type="email" required autoComplete="username" placeholder="Email nhân sự HandsFree" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Mật khẩu<div className="op-password"><input type={show ? "text" : "password"} required autoComplete="current-password" placeholder="Nhập mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{show ? "Ẩn" : "Hiện"}</button></div></label>
        {error && <UserNotice message={error} error />}
        <button className="op-button op-login-submit" disabled={busy}>{busy ? "Đang xác thực…" : "Đăng nhập"}<span>→</span></button>
      </form>}
      <div className="op-login-links"><Link to="/login">Đăng nhập người dùng</Link></div>
      <p className="op-login-caption">Khu vực dành riêng cho nhân sự HandsFree.</p>
    </div></section>
  </div>;
}
