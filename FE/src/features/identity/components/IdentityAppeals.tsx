import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { identityAppealService, appealLabels, type IdentityAppeal } from "../../../services/identityAppealService";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import OperatorModal from "../../management/components/OperatorModal";
import IdentityAppealDetail from "./IdentityAppealDetail";
import "../pages/FaceComparisonPage.css";
export default function IdentityAppeals() {
  const { user } = useAuth(); const [rows, setRows] = useState<IdentityAppeal[]>([]); const [detail, setDetail] = useState<IdentityAppeal | null>(null);
  const [state, setState] = useState("REQUESTED"); const [search, setSearch] = useState(""); const [query, setQuery] = useState("");
  const [page, setPage] = useState(0); const [last, setLast] = useState(true); const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [name, setName] = useState(""); const [reason, setReason] = useState("");
  useEffect(() => { const c = new AbortController(); setLoading(true); setError("");
    void identityAppealService.list(page, state, query, c.signal).then(p => { if (!c.signal.aborted) { setRows(p.content); setLast(p.last); } }).catch(e => { if (!c.signal.aborted) setError(getApiErrorMessage(e, "Không tải được yêu cầu xét duyệt.")); }).finally(() => { if (!c.signal.aborted) setLoading(false); }); return () => c.abort();
  }, [page, state, query, refresh]);
  async function view(id: string) { setBusy(true); setError(""); try { const a = await identityAppealService.get(id); setDetail(a); setName(a.fullName || ""); setReason(""); } catch (e) { setError(getApiErrorMessage(e, "Không mở được yêu cầu.")); } finally { setBusy(false); } }
  async function action(kind: "claim" | "release" | "approve" | "reject") {
    if (!detail || busy) return; setBusy(true); setError("");
    try { const a = kind === "claim" || kind === "release" ? await identityAppealService.claim(detail.id, kind === "release") : await identityAppealService.review(detail.id, kind === "approve", name.trim(), reason.trim()); setDetail(a); setRefresh(x => x + 1); }
    catch (e) { setError(getApiErrorMessage(e, "Yêu cầu đã thay đổi hoặc ADMIN khác đang xử lý. Hãy tải lại.")); } finally { setBusy(false); }
  }
  const owned = detail?.status === "PROCESSING" && detail.claimedBy === user?.id;
  return <section className="op-card" style={{ padding: 20, marginBottom: 20 }}><h2>Yêu cầu USER gửi xét duyệt</h2>
    <form className="op-filter-bar" onSubmit={e => { e.preventDefault(); setPage(0); setQuery(search.trim()); }}><label>Trạng thái<select className="op-input" value={state} onChange={e => { setState(e.target.value); setPage(0); }}><option value="">Tất cả</option>{Object.entries(appealLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><label>Tên người dùng / mã yêu cầu<input className="op-input" maxLength={100} value={search} onChange={e => setSearch(e.target.value)} /></label><button className="op-button secondary" type="submit">Tìm kiếm</button><button className="op-button secondary" type="button" disabled={loading} onClick={() => setRefresh(x => x + 1)}>Làm mới</button></form>
    {error && <p className="op-notice" role="alert">{error}</p>}<div className="op-table-scroll"><table className="op-table"><thead><tr><th>Tài khoản</th><th>Ngày gửi</th><th>Trạng thái</th><th>Người xử lý</th><th>Chi tiết</th></tr></thead><tbody>{rows.map(a => <tr key={a.id}><td title={a.userId}>{a.accountName || "Chưa có tên"}</td><td>{new Date(a.createdAt).toLocaleString("vi-VN")}</td><td>{appealLabels[a.status]}</td><td>{a.claimedBy === user?.id ? "Bạn" : a.claimedName || (a.claimedBy ? "ADMIN khác" : "Chưa nhận")}</td><td><button className="op-row-button" disabled={busy} onClick={() => void view(a.id)}>Xem yêu cầu</button></td></tr>)}</tbody></table>{loading && <p>Đang tải…</p>}{!loading && !rows.length && <p>Chưa có yêu cầu phù hợp.</p>}</div>
    <footer className="op-pagination"><span>Trang {page + 1}</span><button disabled={!page || loading} onClick={() => setPage(page - 1)}>Trước</button><button disabled={last || loading} onClick={() => setPage(page + 1)}>Tiếp</button></footer>
    {detail && <OperatorModal title="Yêu cầu xét duyệt riêng tư" onClose={() => { if (!busy) setDetail(null); }}><IdentityAppealDetail appeal={detail} />
      {detail.status === "REQUESTED" && <button className="op-button" disabled={busy} onClick={() => void action("claim")}>Nhận xử lý</button>}
      {detail.status === "PROCESSING" && !owned && <p className="op-notice">ADMIN khác đang xử lý yêu cầu này.</p>}
      {owned && <section style={{ display: "grid", gap: 12 }}><label>Họ tên trên CCCD đã kiểm tra<input className="op-input" maxLength={100} value={name} onChange={e => setName(e.target.value)} disabled={busy} /></label><label>Lý do duyệt / từ chối<textarea className="op-input" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} /></label><button className="op-button" disabled={busy || name.trim().length < 2 || !reason.trim()} onClick={() => void action("approve")}>Duyệt xác minh</button><button className="op-button secondary" disabled={busy || !reason.trim()} onClick={() => void action("reject")}>Từ chối yêu cầu</button><button className="op-button secondary" disabled={busy} onClick={() => void action("release")}>Huỷ nhận xử lý</button></section>}
      {error && <p className="op-notice" role="alert">{error}</p>}
    </OperatorModal>}
  </section>;
}
