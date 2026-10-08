import { useCallback, useEffect, useState } from "react";
import api from "../../../config/axios";
import { useAuth } from "../../../context/AuthContext";
import type { ApiResponse } from "../../../types/api";
import type { PageResponse } from "../../../types/job";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import OperatorModal from "../components/OperatorModal";

type State = { userId: string; status: string; reason: string | null; submittedAt: string | null; verifiedAt: string | null };
type Dossier = { verification: State; fullName: string | null; documentData: string | null; similarity: number | null; live: boolean | null };
const labels: Record<string, string> = { NOT_SUBMITTED: "Chưa gửi", PROCESSING: "Đang xử lý", REVIEW_REQUIRED: "Cần xác thực CCCD", VERIFIED: "Đã xác thực", REJECTED: "Chưa đạt", ERROR: "Lỗi dịch vụ" };
function PrivateImage({ user, kind }: { user: string; kind: string }) {
  const [url, setUrl] = useState(""); const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController(); let objectUrl = "";
    void api.get(`/admin/identities/${user}/images/${kind}`, { responseType: "blob", signal: controller.signal })
      .then(r => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(r.data); setUrl(objectUrl); } })
      .catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e, "Không tải được ảnh riêng tư.")); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [user, kind]);
  return <figure style={{ margin: 0 }}><figcaption>{kind === "front" ? "Mặt trước CCCD" : kind === "back" ? "Mặt sau CCCD" : "Khuôn mặt đã quét"}</figcaption>{url ? <img src={url} alt={kind} style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 12 }} /> : <p>{error || "Đang tải ảnh…"}</p>}</figure>;
}
export default function IdentityReviewPage() {
  const { user } = useAuth(); const admin = user?.role === "ADMIN";
  const [rows, setRows] = useState<State[]>([]); const [page, setPage] = useState(0); const [last, setLast] = useState(true);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [detail, setDetail] = useState<Dossier | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await api.get<ApiResponse<PageResponse<State>>>("/staff/identities", { params: { page } }); setRows(r.data.result.content); setLast(r.data.result.last); }
    catch (e) { setError(getApiErrorMessage(e, "Không tải được hồ sơ xác thực.")); } finally { setLoading(false); }
  }, [page]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  async function view(id: string) {
    setError("");
    try { const r = await api.get<ApiResponse<Dossier>>(`/admin/identities/${id}`); setDetail(r.data.result); }
    catch (e) { setError(getApiErrorMessage(e, "Không xem được hồ sơ.")); }
  }
  return <div><div className="op-page-heading"><div><h1>Hồ sơ xác thực</h1><p>{admin ? "Xem riêng tư CCCD, ảnh khuôn mặt và kết quả kiểm tra." : "STAFF chỉ xem trạng thái; ảnh CCCD chỉ dành cho ADMIN."}</p></div><button className="op-button secondary" disabled={loading} onClick={() => void load()}>Làm mới</button></div>
    {error && <p className="op-notice" role="alert">{error}</p>}
    <section className="op-card op-table-card"><div className="op-table-scroll"><table className="op-table"><thead><tr><th>Tài khoản</th><th>Trạng thái</th><th>Ngày gửi</th><th>Kết quả</th>{admin && <th>Hồ sơ riêng tư</th>}</tr></thead><tbody>{rows.map(r => <tr key={r.userId}><td>{r.userId}</td><td>{labels[r.status] || r.status}</td><td>{r.submittedAt ? new Date(r.submittedAt).toLocaleString("vi-VN") : "—"}</td><td>{r.reason}</td>{admin && <td><button className="op-row-button" onClick={() => void view(r.userId)}>Xem CCCD & khuôn mặt</button></td>}</tr>)}</tbody></table>{loading && <p role="status">Đang tải…</p>}{!loading && !rows.length && <p className="op-empty">Chưa có hồ sơ</p>}</div><footer className="op-pagination"><span>Trang {page + 1}</span><div><button disabled={!page || loading} onClick={() => setPage(page - 1)}>Trước</button><button disabled={last || loading} onClick={() => setPage(page + 1)}>Tiếp</button></div></footer></section>
    {detail && <OperatorModal title="Hồ sơ danh tính riêng tư" onClose={() => setDetail(null)}><p>{labels[detail.verification.status] || detail.verification.status}: {detail.verification.reason}</p><p>Họ tên đã xác thực: {detail.fullName || "Chưa xác thực"}</p><p>Điểm so khớp: {detail.similarity ?? "—"} · Kiểm tra người thật: {detail.live ? "Đạt kiểm tra của nguồn xác thực" : "Chưa đạt"}</p><div style={{ display: "grid", gap: 20 }}>{["front", "back", "face"].map(kind => <PrivateImage key={`${detail.verification.userId}-${kind}`} user={detail.verification.userId} kind={kind} />)}</div><details><summary>Nội dung OCR và thông tin kiểm tra</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12 }}>{detail.documentData || "Chưa có dữ liệu"}</pre></details><p className="op-muted">REVIEW_REQUIRED chưa mở quyền đăng/nhận việc. OCR và chống giả mạo RGB không chứng minh giấy tờ thật. Luồng cấp VERIFIED hiện có được giữ nguyên.</p></OperatorModal>}
  </div>;
}
