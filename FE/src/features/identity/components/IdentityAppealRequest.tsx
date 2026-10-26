import { useEffect, useState } from "react";
import api from "../../../config/axios";
import type { ApiResponse } from "../../../types/api";
import { Link } from "react-router-dom";
import { identityAppealService, appealLabels, type IdentityAppeal } from "../../../services/identityAppealService";
import { getApiErrorMessage } from "../../auth/utils/apiError";
export default function IdentityAppealRequest({ status, onPending, manual }: { status: string; onPending: (pending: boolean) => void; manual?: { documentNumber: string | null } }) {
  const [appeal, setAppeal] = useState<IdentityAppeal | null>(null);
  const [fullName, setFullName] = useState("");
  const [documentNumber, setDocumentNumber] = useState(manual?.documentNumber || "");
  useEffect(() => { if (manual?.documentNumber) setDocumentNumber(value => value || manual.documentNumber || ""); }, [manual?.documentNumber]);
  const [note, setNote] = useState(""); const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { const controller = new AbortController(); setLoading(true);
    void identityAppealService.latest(controller.signal).then(a => { if (!controller.signal.aborted) setAppeal(a); }).catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e, "Chưa tải được yêu cầu xét duyệt.")); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [status]);
  async function send() { if (busy) return; setBusy(true); setError(""); try { setAppeal(manual ? (await api.post<ApiResponse<IdentityAppeal>>("/identity/progress/review", { fullName: fullName.trim(), documentNumber: documentNumber.trim(), note })).data.result : await identityAppealService.create(note)); setExpanded(false); } catch (e) { setError(getApiErrorMessage(e, "Không gửi được yêu cầu. Vui lòng thử lại.")); } finally { setBusy(false); } }
  const pending = appeal && ["REQUESTED", "PROCESSING"].includes(appeal.status);
  useEffect(() => { onPending(Boolean(pending)); }, [pending, onPending]);
  const canRequest = Boolean(manual && status !== "VERIFIED") || ["REVIEW_REQUIRED", "REJECTED"].includes(status);
  if (!appeal && !canRequest) return null;
  return <section className="hf-face-result hf-match" aria-live="polite"><h2>{pending ? appealLabels[appeal.status] : "Yêu cầu kiểm tra danh tính"}</h2>
    {pending ? <p>Ảnh và thông tin đã gửi được giữ nguyên trong thời gian xét duyệt. Bạn không cần quét lại.</p> : <p>Nếu chưa được xác minh tự động, bạn có thể gửi hồ sơ đã lưu để ADMIN kiểm tra bổ sung.</p>}
    {appeal && <p><Link to={`/identity/requests/${appeal.id}`}>Xem yêu cầu gần nhất · {appealLabels[appeal.status]}</Link></p>}
    {!pending && canRequest && (!expanded ? <button disabled={loading || busy} onClick={() => setExpanded(true)}>Yêu cầu kiểm tra danh tính</button> : <>{manual && <><p>Ảnh hai mặt đã được lưu. ADMIN có thể duyệt thủ công dù hệ thống chưa nhận diện hoặc đối chiếu được. Thông tin dưới đây do bạn khai báo để xét duyệt.</p><label className="hf-manual-field">Họ và tên trên giấy tờ<input autoComplete="name" maxLength={100} value={fullName} disabled={busy} onChange={e => setFullName(e.target.value)} /></label><label className="hf-manual-field">Số CCCD<input maxLength={100} value={documentNumber} disabled={busy} onChange={e => setDocumentNumber(e.target.value)} /></label></>}<label>Ghi chú (không bắt buộc)<textarea maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="Ví dụ: ảnh CCCD được chụp từ nhiều năm trước…" /></label><div className="hf-face-actions"><button disabled={busy || Boolean(manual && (fullName.trim().length < 2 || !documentNumber.trim()))} onClick={() => void send()}>{busy ? "Đang gửi…" : "Gửi yêu cầu xét duyệt"}</button><button disabled={busy} onClick={() => setExpanded(false)}>Huỷ</button></div></>)}
    {!pending && canRequest && <div className="hf-onboarding-actions"><Link className="hf-onboarding-secondary" to="/forgot-password">Khôi phục tài khoản đã có</Link></div>}
    {error && <p role="alert" className="hf-face-error">{error}</p>}
  </section>;
}
