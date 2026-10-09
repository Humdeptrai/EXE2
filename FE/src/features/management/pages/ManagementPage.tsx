import UserNotice from "../../../components/feedback/UserNotice";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import api from "../../../config/axios";
import VndInput from "../../../components/ui/VndInput";
import { AppIcon } from "../../../components/ui/AppIcon";
import ImageViewer from "../../../components/ui/ImageViewer";
import OperatorModal from "../components/OperatorModal";
import type { ApiResponse } from "../../../types/api";
import type { JobPost, PageResponse } from "../../../types/job";
import { formatVnd } from "../../jobs/utils/jobFormat";
import { getApiErrorMessage } from "../../auth/utils/apiError";

type Row = Record<string, string | number | boolean | null>;
type Settings = { consumerFee: number; providerFee: number; minTopUp: number; maxTopUp: number; topUpEnabled: boolean; paymentWindowMinutes: number; ratingDelayMinutes: number };
type Action = { title: string; url: string; method: "post" | "patch"; body: Record<string, string | number | boolean | null>; summary: string; role?: string };
const sections: Record<string, { title: string; subtitle: string; url: string; columns: string[] }> = {
  reports: { title: "Báo cáo & phản hồi", subtitle: "Tiếp nhận, xem xét và xử lý báo cáo từ cộng đồng.", url: "/staff/reports", columns: ["targetType", "reason", "status", "createdAt"] },
  jobs: { title: "Quản lý bài đăng", subtitle: "Kiểm tra nội dung, ảnh gốc và trạng thái hiển thị.", url: "/staff/jobs", columns: ["title", "status", "hidden", "ownerId"] },
  users: { title: "Quản lý tài khoản", subtitle: "Quản lý vai trò và trạng thái hoạt động.", url: "/admin/users", columns: ["fullName", "email", "role", "active", "balance"] },
  matches: { title: "Quản lý kết nối", subtitle: "Theo dõi matching và xử lý hoàn phí khi cần.", url: "/admin/matches", columns: ["title", "consumerId", "providerId", "status"] },
  topups: { title: "Đơn nạp tiền", subtitle: "Theo dõi đơn payOS và thời điểm cộng tiền vào ví.", url: "/admin/topups", columns: ["orderCode", "ownerId", "amount", "status", "createdAt"] },
  ledger: { title: "Sổ giao dịch ví", subtitle: "Lịch sử nạp tiền, trừ phí và hoàn phí.", url: "/admin/ledger", columns: ["ownerId", "kind", "amount", "balanceAfter", "occurredAt"] },
  audit: { title: "Nhật ký quản trị", subtitle: "Theo dõi người thực hiện, thao tác và lý do xử lý.", url: "/admin/audit", columns: ["action", "actorId", "detail", "occurredAt"] },
  settings: { title: "Phí & giới hạn nạp", subtitle: "Cấu hình phí kết nối và giới hạn nạp tiền vào ví.", url: "/admin/settings", columns: [] },
};
const labels: Record<string, string> = { id: "Mã", fullName: "Họ tên", email: "Email", role: "Vai trò", active: "Hoạt động", balance: "Số dư ví", amount: "Số tiền", balanceAfter: "Số dư sau", kind: "Loại giao dịch", description: "Nội dung", occurredAt: "Thời gian", ownerId: "Chủ tài khoản", status: "Trạng thái", targetType: "Loại báo cáo", targetId: "Đối tượng", reporterId: "Người báo cáo", reason: "Nội dung báo cáo", resolution: "Phản hồi", createdAt: "Ngày tạo", title: "Tiêu đề", hidden: "Kiểm duyệt", action: "Thao tác", detail: "Chi tiết", actorId: "Người thực hiện", orderCode: "Mã đơn", checkoutUrl: "Link thanh toán", paymentLinkId: "Mã cổng", requestId: "Mã yêu cầu", creditedAt: "Đã cộng tiền", consumerId: "Người thuê", providerId: "Người nhận việc", dedupeKey: "Mã chống lặp", resolvedAt: "Ngày xử lý", resolvedBy: "Người xử lý" };
const stateLabels: Record<string, string> = { OPEN: "Mới", IN_REVIEW: "Đang xem xét", RESOLVED: "Đã giải quyết", REJECTED: "Từ chối", PENDING: "Chờ xử lý", PAID: "Đã thanh toán", CREDITED: "Đã cộng ví", CANCELLED: "Đã hủy", REFUNDED: "Đã hoàn", USER: "Người dùng", STAFF: "Nhân viên", ADMIN: "Quản trị viên", JOB: "Bài đăng", MATCH: "Kết nối", CONNECTION_FEE: "Phí kết nối", TOPUP: "Nạp tiền", REFUND: "Hoàn phí" };
function display(key: string, value: Row[string]) {
  if (value === null || value === undefined || value === "") return "—";
  if (["balance", "balanceAfter", "amount"].includes(key)) return formatVnd(Number(value));
  if (["createdAt", "occurredAt", "creditedAt", "resolvedAt"].includes(key)) return new Date(String(value)).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  if (key === "hidden") return value ? "Đang ẩn" : "Hiển thị";
  if (typeof value === "boolean") return value ? "Hoạt động" : "Đã khóa";
  return stateLabels[String(value)] || String(value);
}

export default function ManagementPage({ panel }: { panel: string }) {
  const section = sections[panel];
  const [page, setPage] = useState(0); const [last, setLast] = useState(true); const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<Row[]>([]); const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState("");
  const [detail, setDetail] = useState<Row | null>(null); const [job, setJob] = useState<JobPost | null>(null);
  const [image, setImage] = useState<{ url: string; name: string } | null>(null);
  const [action, setAction] = useState<Action | null>(null); const [reason, setReason] = useState(""); const [role, setRole] = useState("USER");
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await api.get<ApiResponse<PageResponse<Row> | Settings>>(section.url, { params: { page }, signal });
      if (panel === "settings") setSettings(response.data.result as Settings);
      else { const result = response.data.result as PageResponse<Row>; setRows(result.content); setLast(result.last); setTotal(result.totalElements); }
      setError("");
    } catch (e) { if (!signal?.aborted) { setRows([]); setError(getApiErrorMessage(e, "Không thể tải dữ liệu.")); } }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [page, panel, section.url]);
  useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => void load(controller.signal), 0); return () => { clearTimeout(timer); controller.abort(); }; }, [load]);
  async function viewJob(id: string) {
    setError(""); setDetail(null);
    try { setJob((await api.get<ApiResponse<JobPost>>(`/staff/jobs/${id}`)).data.result); }
    catch (e) { setError(getApiErrorMessage(e, "Không thể mở bài đăng.")); }
  }
  function startAction(next: Action) { setDetail(null); setAction(next); setReason(""); setRole(next.role || "USER"); setError(""); }
  async function confirm(e: FormEvent) {
    e.preventDefault(); if (!action || busy || !reason.trim()) return;
    setBusy(true);
    try {
      const body = { ...action.body, ...(action.role ? { role } : {}), [panel === "reports" ? "resolution" : "reason"]: reason.trim() };
      await api[action.method](action.url, body); setAction(null); setDetail(null); setMessage("Đã cập nhật thành công."); await load();
    } catch (e) { setError(getApiErrorMessage(e, "Thao tác không thành công.")); }
    finally { setBusy(false); }
  }
  async function saveSettings(e: FormEvent) {
    e.preventDefault(); if (!settings || busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await api.put("/admin/settings", settings); setMessage("Đã lưu cấu hình. Phí và thời gian mới áp dụng cho matching mới."); await load(); }
    catch (e) { setError(getApiErrorMessage(e, "Không thể lưu cấu hình.")); }
    finally { setBusy(false); }
  }
  function actions(row: Row) {
    const buttons = [];
    if (panel === "jobs" || (panel === "reports" && row.targetType === "JOB")) buttons.push(<button key="view" className="op-row-button" onClick={() => void viewJob(String(panel === "jobs" ? row.id : row.targetId))}>Xem bài & ảnh</button>);
    if (panel === "reports") ["IN_REVIEW", "RESOLVED", "REJECTED"].forEach((state) => buttons.push(<button key={state} className="op-row-button" disabled={busy} onClick={() => startAction({ title: stateLabels[state], summary: String(row.reason || "Báo cáo"), url: `/staff/reports/${row.id}`, method: "patch", body: { status: state } })}>{stateLabels[state]}</button>));
    if (panel === "jobs") buttons.push(<button key="hide" className="op-row-button" disabled={busy} onClick={() => startAction({ title: row.hidden ? "Hiện lại bài đăng" : "Ẩn bài đăng", summary: String(row.title), url: `/staff/jobs/${row.id}/visibility`, method: "patch", body: { hidden: !row.hidden } })}>{row.hidden ? "Hiện bài" : "Ẩn bài"}</button>);
    if (panel === "users" && row.role !== "ADMIN") {
      buttons.push(<button key="role" className="op-row-button" disabled={busy} onClick={() => startAction({ title: "Thay đổi vai trò", summary: String(row.fullName), url: `/admin/users/${row.id}`, method: "patch", body: { active: row.active }, role: String(row.role) })}>Đổi vai trò</button>);
      buttons.push(<button key="active" className="op-row-button" disabled={busy} onClick={() => startAction({ title: row.active ? "Khóa tài khoản" : "Mở tài khoản", summary: String(row.fullName), url: `/admin/users/${row.id}`, method: "patch", body: { role: row.role, active: !row.active } })}>{row.active ? "Khóa" : "Mở khóa"}</button>);
    }
    if (panel === "matches") buttons.push(<button key="refund" className="op-row-button danger" disabled={busy} onClick={() => startAction({ title: "Hoàn phí về ví", summary: "Hoàn các khoản phí thực tế đã trả và khóa liên hệ/chat của kết nối này. " + String(row.title), url: `/admin/matches/${row.id}/refund`, method: "post", body: {} })}>Hoàn phí</button>);
    return buttons;
  }
  const filtered = rows.filter((row) => (!filter || String(row.status || row.role || row.kind || "") === filter) && (!search || Object.values(row).some((v) => String(v || "").toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")))));
  const options = Array.from(new Set(rows.map((r) => String(r.status || r.role || r.kind || "")).filter(Boolean)));
  return <div>
    <div className="op-page-heading"><div><p className="op-eyebrow">Vận hành HandsFree</p><h1>{section.title}</h1><p>{section.subtitle}</p></div><button className="op-button secondary" disabled={loading || busy} onClick={() => void load()}><AppIcon name="refresh" className="op-icon" />Làm mới</button></div>
    {message && <p className="op-notice" role="status">{message}</p>}
    {error && !action && <UserNotice message={error} error />}
    {panel === "settings" ? settings && <form className="op-settings-layout" onSubmit={saveSettings}><section className="op-card"><header><div><h2>Phí kết nối</h2><p>Matching đã chốt giữ nguyên mức phí cũ.</p></div><span className="op-pill">VNĐ</span></header><div className="op-field-grid">{([{ key: "consumerFee", label: "Người thuê trả" }, { key: "providerFee", label: "Người nhận việc trả" }, { key: "minTopUp", label: "Nạp tối thiểu" }, { key: "maxTopUp", label: "Nạp tối đa" }] as const).map((f) => <label key={f.key}>{f.label}<VndInput required value={String(settings[f.key])} onValueChange={(v) => setSettings({ ...settings, [f.key]: Number(v) })} /></label>)}</div><div className="op-field-grid mt-5"><label>Thời hạn thanh toán (phút)<input type="number" min={1} max={43200} step={1} required value={settings.paymentWindowMinutes ?? 1440} onChange={(e) => setSettings({ ...settings, paymentWindowMinutes: Number(e.target.value) })} /></label><label>Chờ mở đánh giá sau kết thúc (phút)<input type="number" min={0} max={43200} step={1} required value={settings.ratingDelayMinutes ?? 360} onChange={(e) => setSettings({ ...settings, ratingDelayMinutes: Number(e.target.value) })} /></label></div><p className="op-muted mt-3">360 phút = 6 giờ. Đánh giá mở trong 7 ngày. Matching đã tạo giữ nguyên các mốc thời gian.</p><label className="op-switch-row"><span><strong>Cho phép nạp tiền</strong><small>Backend cần khóa payOS và cấu hình hợp lệ.</small></span><input type="checkbox" checked={settings.topUpEnabled} onChange={(e) => setSettings({ ...settings, topUpEnabled: e.target.checked })} /></label><div className="op-form-footer"><button className="op-button" disabled={busy}>{busy ? "Đang lưu…" : "Lưu cấu hình"}</button></div></section><aside className="op-card op-setting-note"><AppIcon name="info" className="op-kpi-icon" /><h2>Phí của nền tảng</h2><p>Đây là phí mở kết nối, tách biệt với tiền công của công việc.</p><p>Liên hệ và chat chỉ mở sau khi cả hai bên đã trả phí từ ví.</p></aside></form> : <section className="op-card op-table-card"><div className="op-table-toolbar"><label className="op-search"><AppIcon name="search" className="op-icon" /><input aria-label="Tìm trên trang hiện tại" placeholder="Tìm tên, mã hoặc nội dung…" value={search} onChange={(e) => setSearch(e.target.value)} /></label><select aria-label="Lọc trạng thái trên trang hiện tại" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">Tất cả trạng thái</option>{options.map((o) => <option key={o} value={o}>{stateLabels[o] || o}</option>)}</select><span className="op-muted">{total.toLocaleString("vi-VN")} bản ghi</span></div><div className="op-table-scroll" aria-busy={loading}><table className="op-table"><thead><tr>{section.columns.map((key) => <th key={key} scope="col">{labels[key]}</th>)}<th scope="col">Thao tác</th></tr></thead><tbody>{!loading && filtered.map((row, i) => <tr key={String(row.id || row.orderCode || i)}>{section.columns.map((key) => <td key={key}>{["status", "role", "kind", "active", "hidden"].includes(key) ? <span className={`op-status ${["RESOLVED", "PAID", "CREDITED", "ADMIN"].includes(String(row[key])) || row[key] === true ? "positive" : ""}`}>{display(key, row[key])}</span> : <span className={`op-cell ${key.endsWith("Id") ? "op-mono" : ""}`} title={String(row[key] ?? "")}>{display(key, row[key])}</span>}</td>)}<td><div className="op-row-actions"><button className="op-row-button" onClick={() => setDetail(row)}>Chi tiết</button>{actions(row)}</div></td></tr>)}</tbody></table>{loading ? <div className="op-empty" role="status">Đang tải dữ liệu…</div> : !filtered.length && <div className="op-empty"><AppIcon name={search || filter ? "search" : "list"} className="op-empty-icon" /><h3>{search || filter ? "Không có kết quả trên trang này" : "Chưa có dữ liệu"}</h3><p>{search || filter ? "Thử đổi từ khóa, bộ lọc hoặc chuyển trang." : "Dữ liệu mới sẽ xuất hiện tại đây."}</p></div>}</div><footer className="op-pagination"><span>Tìm kiếm và lọc áp dụng trên trang hiện tại · Trang {page + 1}</span><div><button className="op-button secondary" disabled={!page || loading || busy} onClick={() => setPage(page - 1)}>Trước</button><button className="op-button secondary" disabled={last || loading || busy} onClick={() => setPage(page + 1)}>Tiếp</button></div></footer></section>}
    {loading && panel === "settings" && <p role="status">Đang tải cấu hình…</p>}
    {detail && <OperatorModal title="Chi tiết bản ghi" onClose={() => setDetail(null)}><dl className="op-detail-list">{Object.entries(detail).map(([key, v]) => <div key={key}><dt>{labels[key] || key}</dt><dd>{display(key, v)}</dd></div>)}</dl><div className="op-modal-actions">{actions(detail)}</div></OperatorModal>}
    {action && <OperatorModal title={action.title} onClose={() => { if (!busy) setAction(null); }}><form onSubmit={confirm}><p className="op-muted">{action.summary}</p>{action.role && <label>Vai trò mới<select value={role} onChange={(e) => setRole(e.target.value)}><option value="USER">Người dùng</option><option value="STAFF">Nhân viên</option><option value="ADMIN">Quản trị viên</option></select></label>}<label>{panel === "reports" ? "Phản hồi / kết quả xử lý" : "Lý do xử lý"}<textarea required maxLength={1000} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nhập nội dung để lưu vào lịch sử xử lý…" /></label>{error && <UserNotice message={error} error />}<div className="op-modal-actions"><button type="button" className="op-button secondary" disabled={busy} onClick={() => setAction(null)}>Hủy</button><button className="op-button" disabled={busy || !reason.trim()}>{busy ? "Đang xử lý…" : "Xác nhận"}</button></div></form></OperatorModal>}
    {job && !image && <OperatorModal title={job.title} onClose={() => setJob(null)}><p className="op-job-description">{job.description}</p><p className="op-muted">{job.location} · {job.scheduledDate} · {formatVnd(job.budgetAmount)}</p><div className="op-job-images">{job.media.map((m) => <button key={m.id} onClick={() => setImage({ url: m.url, name: m.originalName })}><img src={m.url} alt={m.originalName} /></button>)}</div></OperatorModal>}
    {image && <ImageViewer image={image} onClose={() => setImage(null)} />}
  </div>;
}
