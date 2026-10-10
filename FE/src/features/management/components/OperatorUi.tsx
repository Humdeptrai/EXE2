import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
export const operatorLabels: Record<string, string> = {
  WAITING_PAYMENT: "Chờ thanh toán", CONNECTED: "Đã kết nối", ACTIVE_USER: "Tài khoản hoạt động", LOCKED_USER: "Tài khoản bị khóa", HIDDEN: "Bài đang ẩn", VISIBLE: "Bài không bị ẩn", CREATED: "Đã tạo", JOB_VISIBILITY: "Ẩn / hiện bài", USER_ACCESS: "Quyền tài khoản", FEE_SETTINGS: "Cấu hình phí", RATING_SETTINGS: "Cấu hình đánh giá", CONNECTION_REFUND: "Hoàn phí", IDENTITY_APPROVE: "Duyệt danh tính", IDENTITY_REJECT: "Từ chối danh tính", IDENTITY_CLAIM: "Nhận xét duyệt", IDENTITY_RELEASE: "Hủy nhận xét duyệt", IDENTITY_VIEW: "Xem hồ sơ danh tính", IDENTITY_IMAGE_VIEW: "Xem ảnh xác minh", REPORT_CLAIM: "Nhận báo cáo", REPORT_RELEASE: "Hủy nhận báo cáo", REPORT_RESOLVED: "Giải quyết báo cáo", REPORT_REJECTED: "Từ chối báo cáo", IDENTITY_DOCUMENT_CORRECTION: "Sửa số CCCD", OPEN: "Mới gửi", IN_REVIEW: "Đang xử lý", REQUESTED: "Chờ tiếp nhận", PROCESSING: "Đang xử lý",
  REVIEW_REQUIRED: "Cần kiểm tra", NOT_SUBMITTED: "Chưa gửi", VERIFIED: "Đã xác minh", ERROR: "Lỗi dịch vụ",
  RESOLVED: "Đã giải quyết", REJECTED: "Từ chối", PENDING: "Chờ thanh toán", PAID: "Đã thanh toán", CREDITED: "Đã cộng ví", REFUNDED: "Đã hoàn phí",
  DRAFT: "Bản nháp", PUBLISHED: "Đang hiển thị", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy", EXPIRED: "Hết hạn", DISCONNECTED: "Đã ngắt", ACTIVE: "Đang hoạt động",
  USER: "Người dùng", STAFF: "Nhân viên", ADMIN: "Quản trị viên", TOPUP: "Nạp tiền", REFUND: "Hoàn phí", CONNECTION_FEE: "Phí kết nối",
};
export function StatusBadge({ value, label }: { value: string | number | boolean | null | undefined; label?: string }) {
  const state = String(value ?? "");
  const tone = ["VERIFIED", "RESOLVED", "CONNECTED", "PAID", "CREDITED", "COMPLETED", "true"].includes(state) ? "success"
    : ["REJECTED", "ERROR", "CANCELLED", "EXPIRED", "DISCONNECTED", "false"].includes(state) ? "danger"
    : ["PROCESSING", "IN_REVIEW", "ACTIVE"].includes(state) ? "info"
    : ["OPEN", "REQUESTED", "WAITING_PAYMENT", "PENDING", "REVIEW_REQUIRED", "NOT_SUBMITTED"].includes(state) ? "warning" : "neutral";
  return <span className={`op-status ${tone}`}><i aria-hidden="true" />{label || operatorLabels[state] || state || "Chưa có dữ liệu"}</span>;
}
export function PageHeading({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <div className="op-page-heading"><div><p className="op-eyebrow">Vận hành HandsFree</p><h1>{title}</h1><p>{description}</p></div><div className="op-heading-actions">{actions}</div></div>;
}
export function FilterBar({ search, state, options, onApply, total, placeholder = "Tìm tên, mã hoặc nội dung…" }: { search: string; state: string; options: Record<string,string>; onApply: (search: string, state: string) => void; total?: number; placeholder?: string }) {
  const [draft, setDraft] = useState(search);
  useEffect(() => setDraft(search), [search]);
  return <form className="op-table-toolbar" onSubmit={e => { e.preventDefault(); onApply(draft.trim(), state); }}>
    <label className="op-search"><span className="sr-only">Tìm kiếm</span><AppIcon name="search" className="op-icon" /><input maxLength={100} placeholder={placeholder} value={draft} onChange={e => setDraft(e.target.value)} /></label>
    <label className="op-filter-label"><span className="sr-only">Lọc trạng thái</span><select value={state} onChange={e => onApply(draft.trim(), e.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(options).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <button type="submit" className="op-button secondary">Tìm kiếm</button>{(search || state) && <button type="button" className="op-button quiet" onClick={() => { setDraft(""); onApply("", ""); }}>Xóa bộ lọc</button>}
    {total !== undefined && <span className="op-result-count"><strong>{total.toLocaleString("vi-VN")}</strong> kết quả</span>}
  </form>;
}
export function Pagination({ page, last, total, loading, onPage }: { page: number; last: boolean; total?: number; loading?: boolean; onPage: (page: number) => void }) {
  return <footer className="op-pagination"><span>Trang <strong>{page + 1}</strong>{total !== undefined && ` · ${total.toLocaleString("vi-VN")} kết quả`}</span><div><button type="button" className="op-button secondary" disabled={!page || loading} onClick={() => onPage(page - 1)}>← Trước</button><button type="button" className="op-button secondary" disabled={last || loading} onClick={() => onPage(page + 1)}>Tiếp →</button></div></footer>;
}
export function useOperatorFilters(prefix = "") {
  const [params, setParams] = useSearchParams();
  const search = params.get(prefix + "search") || "";
  const state = params.get(prefix + "state") || "";
  const n = Number(params.get(prefix + "page") || 0);
  const page = Number.isSafeInteger(n) && n >= 0 ? n : 0;
  function apply(search: string, state: string) { setParams(previous => { const next = new URLSearchParams(previous); for (const [key,value] of [["search",search],["state",state]]) { if(value) next.set(prefix+key,value); else next.delete(prefix+key); } next.delete(prefix+"page"); return next; }); }
  function setPage(page: number) { setParams(previous => { const next = new URLSearchParams(previous); if(page) next.set(prefix+"page",String(page)); else next.delete(prefix+"page"); return next; }); }
  return { search, state, page, apply, setPage };
}
