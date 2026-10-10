import { useCallback, useEffect, useState } from "react";
import IdentityImageViewer from "../../../components/feedback/IdentityImageViewer";
import IdentityAppeals from "../../identity/components/IdentityAppeals";
import api from "../../../config/axios";
import { useAuth } from "../../../context/AuthContext";
import type { ApiResponse } from "../../../types/api";
import type { PageResponse } from "../../../types/job";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import OperatorModal from "../components/OperatorModal";
import { PageHeading, FilterBar, Pagination, StatusBadge, useOperatorFilters } from "../components/OperatorUi";

type State = { userId: string; accountName?: string; status: string; reason: string | null; submittedAt: string | null; verifiedAt: string | null };
type Dossier = { verification: State; fullName: string | null; documentData: string | null; similarity: number | null; live: boolean | null; documentNumber: string | null; pending: boolean; version: number; selfiePresent: boolean; activeVerified: boolean };
const labels: Record<string, string> = { NOT_SUBMITTED: "Chưa gửi", PROCESSING: "Đang xử lý", REVIEW_REQUIRED: "Cần kiểm tra bổ sung", VERIFIED: "Đã xác thực", REJECTED: "Chưa đạt", ERROR: "Lỗi dịch vụ" };
function PrivateImage({ user, kind }: { user: string; kind: string }) {
  const [url, setUrl] = useState(""); const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController(); let objectUrl = "";
    void api.get(`/admin/identities/${user}/images/${kind}`, { responseType: "blob", signal: controller.signal })
      .then(r => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(r.data); setUrl(objectUrl); } })
      .catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e, "Không tải được ảnh riêng tư.")); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [user, kind]);
  return <figure style={{ margin: 0 }}><figcaption>{kind === "front" ? "Mặt trước CCCD" : kind === "back" ? "Mặt sau CCCD" : kind === "selfie" ? "Selfie chụp trực tiếp" : "Khuôn mặt đã quét"}</figcaption>{url ? <IdentityImageViewer src={url} alt={kind} style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 12 }} /> : <p>{error || "Đang tải ảnh…"}</p>}</figure>;
}
export default function IdentityReviewPage() {
  const { user } = useAuth(); const admin = user?.role === "ADMIN";
  const [documentNumber, setDocumentNumber] = useState(""); const [correctionReason, setCorrectionReason] = useState("");
  const [reviewName, setReviewName] = useState(""); const [reviewReason, setReviewReason] = useState(""); const [reviewing, setReviewing] = useState(false);
  const [rows, setRows] = useState<State[]>([]); const { page, setPage, search, state, apply } = useOperatorFilters(); const [total,setTotal] = useState(0); const [last, setLast] = useState(true);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [detail, setDetail] = useState<Dossier | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try { const r = await api.get<ApiResponse<PageResponse<State>>>("/staff/identities", { params: { page, search, state }, signal }); if (signal?.aborted) return; setRows(r.data.result.content); setLast(r.data.result.last); setTotal(r.data.result.totalElements); }
    catch (e) { if (!signal?.aborted) setError(getApiErrorMessage(e, "Không tải được hồ sơ xác thực.")); } finally { if (!signal?.aborted) setLoading(false); }
  }, [page, search, state]);
  useEffect(() => { const c = new AbortController(); const timer = setTimeout(() => void load(c.signal), 0); return () => { clearTimeout(timer); c.abort(); }; }, [load]);
  async function view(id: string) {
    setError("");
    try { const r = await api.get<ApiResponse<Dossier>>(`/admin/identities/${id}`); setDetail(r.data.result); setDocumentNumber(r.data.result.documentNumber || ""); setCorrectionReason(""); setReviewName(""); setReviewReason(""); }
    catch (e) { setError(getApiErrorMessage(e, "Không xem được hồ sơ.")); }
  }
  async function review(approved: boolean) {
    if (!detail || reviewing) return;
    setReviewing(true); setError("");
    try {
      await api.post(`/admin/identities/${detail.verification.userId}/review`, {
        approved, version: detail.version, submittedAt: detail.verification.submittedAt, fullName: reviewName.trim(), reason: reviewReason.trim(),
      });
      setDetail(null); await load();
    } catch (e) { setError(getApiErrorMessage(e, "Không xử lý được hồ sơ. Hãy tải lại nếu hồ sơ đã thay đổi.")); }
    finally { setReviewing(false); }
  }
  async function correctDocument() {
    if (!detail || reviewing) return;
    setReviewing(true); setError("");
    try {
      const r = await api.patch<ApiResponse<Dossier>>(`/admin/identities/${detail.verification.userId}/document-number`, { documentNumber, reason: correctionReason.trim(), pending: detail.pending, version: detail.version });
      setDetail(r.data.result); setCorrectionReason(""); await load();
    } catch (e) { setError(getApiErrorMessage(e, "Không sửa được số CCCD. Hãy tải lại hồ sơ.")); }
    finally { setReviewing(false); }
  }
  return <div><PageHeading title="Hồ sơ xác thực" description={admin ? "Xác minh tự động và các hồ sơ cần ADMIN kiểm tra bổ sung." : "Theo dõi trạng thái xác minh. Thông tin CCCD riêng tư chỉ dành cho ADMIN."} actions={<button className="op-button secondary" disabled={loading} onClick={() => void load()}>Làm mới</button>} />
    {admin && <IdentityAppeals />}
    {error && <p className="op-notice" role="alert">{error}</p>}
    <section className="op-card op-table-card"><div className="op-section-heading"><h2>Tất cả hồ sơ xác thực</h2><p>Trạng thái hiện tại của hồ sơ mới nhất.</p></div><FilterBar search={search} state={state} options={labels} onApply={apply} total={total} /><div className="op-table-scroll"><table className="op-table"><thead><tr><th>Tài khoản</th><th>Trạng thái</th><th>Ngày gửi</th><th>Kết quả</th>{admin && <th>Hồ sơ riêng tư</th>}</tr></thead><tbody>{rows.map(r => <tr key={r.userId}><td className="op-cell-primary" title={r.userId}>{r.accountName || "Chưa có tên"}</td><td><StatusBadge value={r.status} label={labels[r.status]} /></td><td>{r.submittedAt ? new Date(r.submittedAt).toLocaleString("vi-VN") : "—"}</td><td>{r.reason}</td>{admin && <td><button className="op-row-button primary" onClick={() => void view(r.userId)}>Xem CCCD & khuôn mặt</button></td>}</tr>)}</tbody></table>{loading && <p role="status">Đang tải…</p>}{!loading && !rows.length && <p className="op-empty">Chưa có hồ sơ</p>}</div><Pagination page={page} last={last} total={total} loading={loading} onPage={setPage} /></section>
    {detail && <OperatorModal variant="wide" title="Hồ sơ danh tính riêng tư" onClose={() => { if (!reviewing) setDetail(null); }}><div className="op-review-summary"><StatusBadge value={detail.verification.status} label={labels[detail.verification.status]} /><p><strong>Lý do / kết quả:</strong> {detail.verification.reason || "Chưa có thông tin"}</p></div><p>Họ tên được xác nhận: {detail.fullName || "Chưa xác thực"}</p><p>Điểm so khớp: {detail.similarity ?? "—"} · Kiểm tra động tác/PAD: {detail.live ? "Đạt kiểm tra của nguồn xử lý" : "Chưa đạt"}</p><section className="op-evidence-section"><h3>Bằng chứng xác minh</h3><div className="op-identity-images">{(detail.selfiePresent ? ["front", "back", "face", "selfie"] : ["front", "back", "face"]).map(kind => <PrivateImage key={`${detail.verification.userId}-${detail.pending}-${detail.version}-${kind}`} user={detail.verification.userId} kind={kind} />)}</div></section><details><summary>Nội dung OCR và thông tin kiểm tra</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12 }}>{detail.documentData || "Chưa có dữ liệu"}</pre></details><p className="op-muted">Hồ sơ VERIFIED có thể được xác minh tự động hoặc duyệt thủ công; xem lý do để biết nguồn xác minh. Hồ sơ cần kiểm tra bổ sung có thể được người dùng thực hiện lại hoặc ADMIN duyệt sau khi kiểm tra đủ ảnh và OCR. Kiểm tra này không xác nhận giấy tờ do cơ quan nhà nước cấp.</p>
      {detail.activeVerified && detail.pending && <p className="op-notice">Đây là bản cập nhật. Hồ sơ đã xác minh vẫn có hiệu lực cho đến khi bản mới được duyệt.</p>}
      {!detail.selfiePresent && <p className="op-notice">Hồ sơ cũ chưa có selfie riêng. Người dùng cần thực hiện quy trình xác minh mới.</p>}
      {admin && <section style={{ display: "grid", gap: 12, margin: "16px 0" }}>
        <label>Số CCCD (12 chữ số)<input className="op-input" inputMode="numeric" maxLength={12} value={documentNumber} onChange={e => setDocumentNumber(e.target.value.replace(/\D/g, ""))} disabled={reviewing} /></label>
        <label>Lý do sửa sau khi đối chiếu ảnh<textarea className="op-input" maxLength={300} value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} disabled={reviewing} /></label>
        <button className="op-button secondary" disabled={reviewing || !/^\d{12}$/.test(documentNumber) || !correctionReason.trim()} onClick={() => void correctDocument()}>Lưu số CCCD và ghi lịch sử sửa</button>
        {error && <p className="op-notice" role="alert">{error}</p>}
      </section>}
      {admin && detail.pending && detail.verification.status === "REVIEW_REQUIRED" && <section style={{ display: "grid", gap: 12 }}>
        <label>Họ tên trên CCCD đã kiểm tra<input className="op-input" style={{ display: "block", width: "100%", marginTop: 6 }} value={reviewName} maxLength={100} disabled={reviewing} onChange={e => setReviewName(e.target.value)} /></label>
        <label>Lý do duyệt / từ chối<textarea className="op-input" style={{ display: "block", width: "100%", marginTop: 6 }} value={reviewReason} maxLength={500} disabled={reviewing} onChange={e => setReviewReason(e.target.value)} /></label>
        {error && <p className="op-notice" role="alert">{error}</p>}
        <button className="op-button" disabled={reviewing || !detail.selfiePresent || reviewName.trim().length < 2 || !reviewReason.trim()} onClick={() => void review(true)}>Tôi đã kiểm tra hồ sơ — duyệt xác minh</button>
        <button className="op-button danger" disabled={reviewing || !reviewReason.trim()} onClick={() => void review(false)}>Từ chối và yêu cầu gửi lại</button>
      </section>}</OperatorModal>}
  </div>;
}
