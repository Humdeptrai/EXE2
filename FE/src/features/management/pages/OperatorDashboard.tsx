import RevenueChart from "../components/RevenueChart";
import MonthPicker from "../components/MonthPicker";
import UserNotice from "../../../components/feedback/UserNotice";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../config/axios";
import { useAuth } from "../../../context/AuthContext";
import { AppIcon } from "../../../components/ui/AppIcon";
import type { ApiResponse } from "../../../types/api";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import { formatVnd } from "../../jobs/utils/jobFormat";

type Bucket = { date: string; fees: number; refunds: number; topups: number };
interface Analytics {
  month: string; today?: string; generatedAt?: string; users: number; jobs: number; matches: number; reports: number;
  pendingReports: number; pendingIdentities: number; hiddenJobs: number; grossFees: number; refunds: number;
  netFees: number; topups: number; walletLiability: number; feeTransactions: number;
  monthFees: number; monthRefunds: number; monthNetFees: number; monthTopups: number;
  daily: Bucket[]; reportStatuses: { status: string; total: number }[];
  jobStatuses: { status: string; total: number }[];
}
const number = (n: number) => new Intl.NumberFormat("vi-VN").format(n || 0);
const statuses: Record<string, string> = { OPEN: "Mới", IN_REVIEW: "Đang xem xét", RESOLVED: "Đã giải quyết", REJECTED: "Từ chối", DRAFT: "Bản nháp", PUBLISHED: "Đang hiển thị", CLOSED: "Đã đóng", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy" };

export default function OperatorDashboard({ revenueOnly = false }: { revenueOnly?: boolean }) {
  const { user } = useAuth(); const admin = user?.role === "ADMIN"; const base = admin ? "/admin" : "/staff";
  const [month, setMonth] = useState(() => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).format(new Date()));
  const [data, setData] = useState<Analytics | null>(null); const [error, setError] = useState(""); const [revision, setRevision] = useState(0); const [loading, setLoading] = useState(true);
  const [presence, setPresence] = useState<{ onlineUsers: number; observedAt: string } | null>(null);
  const [presenceError, setPresenceError] = useState(false);
  useEffect(() => {
    if (!admin) return;
    const controller = new AbortController();
    let pending = false;
    const refresh = async () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const r = await api.get<ApiResponse<{ onlineUsers: number; observedAt: string }>>("/admin/presence", { signal: controller.signal });
        if (!controller.signal.aborted) { setPresence(r.data.result); setPresenceError(false); }
      } catch { if (!controller.signal.aborted) setPresenceError(true); }
      finally { pending = false; }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); };
  }, [admin, revenueOnly, revision]);
  useEffect(() => {
    const controller = new AbortController();
    api.get<ApiResponse<Analytics>>(admin ? "/admin/analytics" : "/staff/analytics", { params: admin ? { month } : {}, signal: controller.signal })
      .then((r) => { setData(r.data.result); setError(""); })
      .catch((e) => { if (!controller.signal.aborted) setError(getApiErrorMessage(e, "Không thể tải thống kê.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [admin, month, revision]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") setRevision(v => v + 1); };
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  const cards = data ? admin ? [
    { title: "Tổng tài khoản", value: number(data.users), sub: "Tất cả vai trò và trạng thái", icon: "users" as const, to: "/admin/users" },
    { title: "Đang online", value: presence ? number(presence.onlineUsers) : "—", sub: presenceError ? "Chưa cập nhật được số online" : presence ? `Cập nhật ${new Date(presence.observedAt).toLocaleTimeString("vi-VN")} · mỗi 30 giây` : "Tài khoản đang kết nối", icon: "check" as const, to: "/admin/users" },
    { title: "Phí kết nối thuần trong tháng", value: formatVnd(data.monthNetFees), sub: "Phí đã thu − phí đã hoàn", icon: "star" as const, to: "/admin/revenue" },
    { title: "Tiền nạp trong tháng", value: formatVnd(data.monthTopups), sub: "Tiền vào ví, tách khỏi phí app", icon: "bookmark" as const, to: "/admin/topups" },
    { title: "Kết nối", value: number(data.matches), sub: "Tổng kết nối trên hệ thống", icon: "chat" as const, to: "/admin/matches" },
    { title: "Báo cáo chờ xử lý", value: number(data.pendingReports), sub: "Mới và đang xem xét", icon: "bell" as const, to: `${base}/reports` },
    { title: "Hồ sơ cần kiểm tra", value: number(data.pendingIdentities), sub: "Hồ sơ chưa được xác minh", icon: "users" as const, to: "/admin/identities?state=REVIEW_REQUIRED" },
  ] : [
    { title: "Báo cáo chờ xử lý", value: number(data.pendingReports), sub: "Cần đội ngũ hỗ trợ", icon: "bell" as const, to: `${base}/reports` },
    { title: "Tổng báo cáo", value: number(data.reports), sub: "Tất cả trạng thái", icon: "list" as const, to: `${base}/reports` },
    { title: "Bài đăng", value: number(data.jobs), sub: "Tổng bài trên hệ thống", icon: "briefcase" as const, to: `${base}/jobs` },
    { title: "Bài đang ẩn", value: number(data.hiddenJobs), sub: "Ẩn bởi kiểm duyệt", icon: "image" as const, to: `${base}/jobs` },
  ] : [];
  return <div className="op-dashboard">
    <div className="op-page-heading"><div><p className="op-eyebrow">{revenueOnly ? "Tài chính" : `Chào ${user?.fullName || "bạn"}`}</p><h1>{revenueOnly ? "Doanh thu & dòng tiền" : admin ? "Tổng quan hệ thống" : "Không gian hỗ trợ"}</h1><p>{admin ? "Theo dõi hoạt động và dòng tiền của HandsFree." : "Ưu tiên báo cáo và giữ cộng đồng an toàn."}</p></div><div className="op-heading-actions">{admin && <MonthPicker value={month} onChange={value => { setMonth(value); setLoading(true); setData(null); }} />}<button className="op-button secondary" onClick={() => { setRevision((v) => v + 1); setLoading(true); }} disabled={loading}><AppIcon name="refresh" className="op-icon" />Làm mới</button></div></div>
    {data?.generatedAt && <p className="op-revenue-help">Cập nhật lúc {new Date(data.generatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · Tự cập nhật mỗi phút</p>}
    {error && <UserNotice message={error} error />}
    {!data && loading && <div className="op-empty" role="status">Đang tải số liệu…</div>}
    {data && <><div className="op-kpi-grid">{cards.map((c) => <Link to={c.to} className="op-kpi" key={c.title}><div className="op-kpi-head"><span>{c.title}</span><AppIcon name={c.icon} className="op-kpi-icon" /></div><strong>{c.value}</strong><small>{c.sub} <span aria-hidden="true">→</span></small></Link>)}</div>
      {admin && <div className="op-dashboard-grid"><section className="op-card op-chart-card"><header><div><h2>Xu hướng theo ngày</h2><p>Tháng {data.month} · Giờ Việt Nam</p></div><span className="op-pill">VNĐ</span></header><RevenueChart key={data.month} days={data.daily} today={data.today || new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date())} /></section><section className="op-card op-finance-summary"><h2>Dòng tiền tháng đã chọn</h2><p>Phí kết nối từ sổ giao dịch ví.</p><dl><div><dt>Phí đã thu</dt><dd>{formatVnd(data.monthFees)}</dd></div><div><dt>Phí đã hoàn</dt><dd>{formatVnd(data.monthRefunds)}</dd></div><div className="op-total"><dt>Phí kết nối thuần</dt><dd>{formatVnd(data.monthNetFees)}</dd></div><div><dt>Nạp vào ví</dt><dd>{formatVnd(data.monthTopups)}</dd></div></dl><Link className="op-button secondary" to="/admin/ledger">Xem sổ giao dịch <span>→</span></Link></section></div>}
      {admin && <section className="op-card"><header><div><h2>Lũy kế toàn hệ thống</h2><p>Phí đã thu, hoàn phí và số dư ví hiện tại.</p></div></header><div className="op-lifetime"><div><span>Phí kết nối thuần</span><strong>{formatVnd(data.netFees)}</strong></div><div><span>Tổng tiền đã nạp</span><strong>{formatVnd(data.topups)}</strong></div><div><span>Số dư ví người dùng</span><strong>{formatVnd(data.walletLiability)}</strong></div><div><span>Lượt trừ phí</span><strong>{number(data.feeTransactions)}</strong></div></div></section>}
      <div className="op-dashboard-grid"><section className="op-card"><header><div><h2>Trạng thái báo cáo</h2><p>{number(data.reports)} báo cáo trên hệ thống</p></div><Link to={`${base}/reports`} className="op-text-link">Xử lý báo cáo →</Link></header><div className="op-status-bars">{data.reportStatuses.length ? data.reportStatuses.map((s) => <div key={s.status}><div><span>{statuses[s.status] || s.status}</span><strong>{number(s.total)}</strong></div><div className="op-bar-track"><i style={{ width: `${Math.max(2, Number(s.total) / Math.max(1, data.reports) * 100)}%` }} /></div></div>) : <p className="op-muted">Chưa có báo cáo.</p>}</div></section>
      <section className="op-card"><header><div><h2>{admin ? "Hoạt động cộng đồng" : "Kiểm duyệt bài đăng"}</h2><p>Các thao tác thường dùng</p></div></header><div className="op-quick-links"><Link to={`${base}/jobs`}><AppIcon name="briefcase" className="op-icon" /><span><strong>{number(data.jobs)} bài đăng</strong><small>Xem nội dung và ảnh gốc</small></span><b>→</b></Link><Link to={`${base}/${admin ? "users" : "reports"}`}><AppIcon name={admin ? "users" : "bell"} className="op-icon" /><span><strong>{admin ? `${number(data.users)} tài khoản` : `${number(data.pendingReports)} báo cáo chờ`}</strong><small>{admin ? "Quản lý trạng thái và vai trò" : "Tiếp nhận và phản hồi báo cáo"}</small></span><b>→</b></Link>{admin && <Link to="/admin/settings"><AppIcon name="filter" className="op-icon" /><span><strong>Cấu hình phí kết nối</strong><small>Áp dụng cho kết nối mới</small></span><b>→</b></Link>}</div></section></div>
    </>}
  </div>;
}
