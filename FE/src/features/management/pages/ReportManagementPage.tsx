import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { reportService } from "../../../services/reportService";
import { reportStatuses, reportTargets, type Report } from "../../../types/report";
import UserNotice from "../../../components/feedback/UserNotice";
import OperatorModal from "../components/OperatorModal";
import ReportDetailContent from "../components/ReportDetailContent";
import { getApiErrorMessage } from "../../auth/utils/apiError";
export default function ReportManagementPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Report[]>([]); const [page, setPage] = useState(0); const [last, setLast] = useState(true);
  const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Report | null>(null); const detailId = detail?.id;
  const [action, setAction] = useState<{ report: Report; status: "RESOLVED" | "REJECTED" } | null>(null);
  const [resolution, setResolution] = useState(""); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [filter, setFilter] = useState(""); const [search, setSearch] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await reportService.list(page, signal);
      if (signal?.aborted) return;
      setItems(result.content); setLast(result.last); setTotal(result.totalElements);
      if (detailId) { const current = await reportService.detail(detailId, signal); if (!signal?.aborted) setDetail(current); }
    } catch (e) { if (!signal?.aborted) setError(getApiErrorMessage(e, "Không tải được báo cáo.")); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [page, detailId]);
  useEffect(() => {
    const controller = new AbortController(); let pending = false;
    const refresh = async () => { if (pending || lock.current || document.visibilityState !== "visible") return; pending = true; try { await load(controller.signal); } finally { pending = false; } };
    const initial = window.setTimeout(() => void refresh(), 0); const interval = window.setInterval(() => void refresh(), 15000);
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); clearTimeout(initial); clearInterval(interval); document.removeEventListener("visibilitychange", visible); };
  }, [load]);
  async function view(report: Report) {
    setError("");
    try { setDetail(await reportService.detail(report.id)); } catch (e) { setError(getApiErrorMessage(e, "Không mở được báo cáo.")); }
  }
  async function change(report: Report, mode: "claim" | "release" | "resolve") {
    if (lock.current) return;
    if (mode === "resolve" && !resolution.trim()) { setError("Vui lòng nhập đầy đủ phản hồi / lý do xử lý."); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      const result = mode === "claim" ? await reportService.claim(report.id) : mode === "release" ? await reportService.release(report.id) : await reportService.resolve(report.id, action!.status, resolution.trim());
      if (detailId === result.id) setDetail(result);
      setAction(null); setResolution("");
      setMessage(mode === "claim" ? "Đã nhận case. STAFF khác không thể xử lý case này." : mode === "release" ? "Đã hủy nhận xử lý; case trở về trạng thái Mới." : "Đã lưu kết quả và gửi thông báo đến người báo cáo.");
      await load();
    } catch (e) { setError(getApiErrorMessage(e, "Không thực hiện được thao tác.")); await load(); }
    finally { lock.current = false; setBusy(false); }
  }
  function actions(report: Report) {
    return <>
      {report.canClaim && <button type="button" className="op-row-button" disabled={busy} onClick={() => void change(report, "claim")}>Nhận xử lý</button>}
      {report.canRelease && <button type="button" className="op-row-button" disabled={busy} onClick={() => void change(report, "release")}>Hủy xử lý</button>}
      {report.canResolve && (["RESOLVED", "REJECTED"] as const).map(status => <button type="button" key={status} className="op-row-button" disabled={busy} onClick={() => { setDetail(null); setAction({ report, status }); setResolution(""); setError(""); }}>{reportStatuses[status]}</button>)}
      {report.status === "IN_REVIEW" && !report.canResolve && <span className="op-muted">{report.assignedName || "Nhân viên khác"} đang xử lý</span>}
    </>;
  }
  const filtered = items.filter(r => (!filter || r.status === filter) && (!search || [r.id, r.reason, r.targetId, r.reporterName || "", r.targetName || "", r.assignedName || ""].some(v => v.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")))));
  return <div>
    <div className="op-page-heading"><div><p className="op-eyebrow">Vận hành HandsFree</p><h1>Báo cáo & phản hồi</h1><p>Nhận case, xem bằng chứng và phản hồi người dùng. Danh sách tự cập nhật mỗi 15 giây.</p></div><button type="button" className="op-button secondary" disabled={busy} onClick={() => void load()}>Làm mới</button></div>
    {user?.role === "ADMIN" && <p className="op-muted mb-4">ADMIN có thể giải quyết hoặc hủy phân công case đang được nhận. Thao tác được ghi vào nhật ký.</p>}
    {message && <p className="op-notice" role="status">{message}</p>}{error && !action && <UserNotice message={error} error />}
    <section className="op-card op-table-card"><div className="op-table-toolbar"><label className="op-search"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên người gửi, mã hoặc nội dung…" aria-label="Tìm báo cáo trên trang hiện tại" /></label><select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Lọc trạng thái trên trang hiện tại"><option value="">Tất cả trạng thái</option>{Object.entries(reportStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><span className="op-muted">{total} báo cáo</span></div>
      <div className="op-table-scroll"><table className="op-table"><thead><tr><th>Người báo cáo</th><th>Người được báo cáo / liên quan</th><th>Loại</th><th>Nội dung</th><th>Trạng thái</th><th>Người xử lý</th><th>Ngày gửi</th><th>Thao tác</th></tr></thead><tbody>{filtered.map(r => <tr key={r.id}><td title={r.reporterId}>{r.reporterName || "Chưa có tên"}</td><td title={r.targetId}>{r.targetName || "—"}</td><td>{reportTargets[r.targetType]}</td><td><span className="op-cell" title={r.reason}>{r.reason}</span></td><td><span className={`op-status ${r.status === "RESOLVED" ? "positive" : ""}`}>{reportStatuses[r.status]}</span></td><td>{r.assignedName || "Chưa nhận"}</td><td>{new Date(r.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</td><td><div className="op-row-actions"><button type="button" className="op-row-button" onClick={() => void view(r)}>Chi tiết & bằng chứng</button>{actions(r)}</div></td></tr>)}</tbody></table>{loading ? <p className="op-empty" role="status">Đang tải báo cáo…</p> : !filtered.length && <p className="op-empty">Không có báo cáo trên trang này.</p>}</div>
      <footer className="op-pagination"><span>Tìm kiếm/lọc trên trang hiện tại · Trang {page + 1}</span><div><button className="op-button secondary" disabled={!page || busy} onClick={() => setPage(p => p - 1)}>Trước</button><button className="op-button secondary" disabled={last || busy} onClick={() => setPage(p => p + 1)}>Tiếp</button></div></footer>
    </section>
    {detail && <OperatorModal title="Chi tiết báo cáo" onClose={() => setDetail(null)}><ReportDetailContent report={detail} /><div className="op-modal-actions">{actions(detail)}</div></OperatorModal>}
    {action && <OperatorModal title={reportStatuses[action.status]} onClose={() => { if (!busy) setAction(null); }}><form noValidate onSubmit={e => { e.preventDefault(); void change(action.report, "resolve"); }}><p className="op-muted">{action.report.reason}</p><label>Phản hồi / lý do đầy đủ<textarea disabled={busy} value={resolution} onChange={e => setResolution(e.target.value)} maxLength={2000} rows={7} placeholder="Người gửi sẽ xem toàn bộ nội dung này khi bấm vào thông báo." /></label><p className="op-muted">{resolution.length}/2.000 ký tự</p>{error && <UserNotice message={error} error />}<div className="op-modal-actions"><button type="button" className="op-button secondary" disabled={busy} onClick={() => setAction(null)}>Quay lại</button><button className="op-button" disabled={busy}>{busy ? "Đang lưu…" : "Lưu và thông báo"}</button></div></form></OperatorModal>}
  </div>;
}
