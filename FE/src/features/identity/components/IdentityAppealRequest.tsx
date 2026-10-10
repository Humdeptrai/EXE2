import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { identityAppealService, appealLabels, type IdentityAppeal } from "../../../services/identityAppealService";
import { getApiErrorMessage } from "../../auth/utils/apiError";
export default function IdentityAppealRequest({ status, onPending }: { status: string; onPending: (pending: boolean) => void }) {
  const [appeal, setAppeal] = useState<IdentityAppeal | null>(null);
  const [note, setNote] = useState(""); const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { const controller = new AbortController(); setLoading(true);
    void identityAppealService.latest(controller.signal).then(a => { if (!controller.signal.aborted) setAppeal(a); }).catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e, "Chưa tải được yêu cầu xét duyệt.")); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [status]);
  async function send() { if (busy) return; setBusy(true); setError(""); try { setAppeal(await identityAppealService.create(note)); setExpanded(false); } catch (e) { setError(getApiErrorMessage(e, "Không gửi được yêu cầu. Vui lòng thử lại.")); } finally { setBusy(false); } }
  const pending = appeal && ["REQUESTED", "PROCESSING"].includes(appeal.status);
  useEffect(() => { onPending(Boolean(pending)); }, [pending, onPending]);
  if (!appeal && !["REVIEW_REQUIRED", "REJECTED"].includes(status)) return null;
  return <section className="hf-face-result hf-match" aria-live="polite"><h2>{pending ? appealLabels[appeal.status] : "Nhờ ADMIN kiểm tra hồ sơ"}</h2>
    {pending ? <p>Ảnh và thông tin đã gửi được giữ nguyên trong thời gian xét duyệt. Bạn không cần quét lại.</p> : <p>Nếu chưa được xác minh tự động, bạn có thể gửi hồ sơ đã lưu để ADMIN kiểm tra bổ sung.</p>}
    {appeal && <p><Link to={`/identity/requests/${appeal.id}`}>Xem yêu cầu gần nhất · {appealLabels[appeal.status]}</Link></p>}
    {!pending && ["REVIEW_REQUIRED", "REJECTED"].includes(status) && (!expanded ? <button disabled={loading || busy} onClick={() => setExpanded(true)}>Yêu cầu ADMIN xét duyệt</button> : <><label>Ghi chú (không bắt buộc)<textarea maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="Ví dụ: ảnh CCCD được chụp từ nhiều năm trước…" /></label><div className="hf-face-actions"><button disabled={busy} onClick={() => void send()}>{busy ? "Đang gửi…" : "Gửi yêu cầu xét duyệt"}</button><button disabled={busy} onClick={() => setExpanded(false)}>Huỷ</button></div></>)}
    {error && <p role="alert" className="hf-face-error">{error}</p>}
  </section>;
}
