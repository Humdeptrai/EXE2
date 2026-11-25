import { useEffect, useRef, useState, type FormEvent } from "react";
import api from "../../../config/axios";
import type { ApiResponse } from "../../../types/api";
import UserNotice from "../../../components/feedback/UserNotice";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import OperatorModal from "./OperatorModal";

type Schedule = {
  matchId: string; jobId: string; title: string; startAt: string; endAt: string | null;
  updatedAt: string; matchingCount: number; timeZone: string;
};
export default function AdminMatchScheduleForm({ matchId, onClose, onSaved }: {
  matchId: string; onClose: () => void; onSaved: () => void;
}) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void api.get<ApiResponse<Schedule>>(`/admin/matches/${matchId}/schedule`, { signal: controller.signal }).then(response => {
      if (controller.signal.aborted) return;
      setSchedule(response.data.result); setStartAt(response.data.result.startAt);
      setEndAt(response.data.result.endAt || ""); setError("");
    }).catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e, "Không tải được lịch công việc.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [matchId, revision]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schedule || lock.current) return;
    setError("");
    if (!startAt || !endAt || !Number.isFinite(Date.parse(startAt)) || !Number.isFinite(Date.parse(endAt)) || Date.parse(endAt) <= Date.parse(startAt)) {
      setError("Vui lòng chọn thời gian kết thúc sau thời gian bắt đầu."); return;
    }
    if (!reason.trim()) { setError("Vui lòng nhập lý do điều chỉnh lịch."); return; }
    lock.current = true; setBusy(true);
    try {
      await api.patch(`/admin/matches/${matchId}/schedule`, { startAt, endAt, expectedUpdatedAt: schedule.updatedAt, reason: reason.trim() });
      onSaved();
    } catch (e) { setError(getApiErrorMessage(e, "Không lưu được lịch. Vui lòng tải lại lịch mới nhất trước khi thử lại.")); }
    finally { lock.current = false; setBusy(false); }
  }
  function reload() {
    if (busy) return;
    setLoading(true); setSchedule(null); setError(""); setReason(""); setRevision(value => value + 1);
  }
  return <OperatorModal title="Chỉnh lịch công việc" onClose={() => { if (!lock.current) onClose(); }}>
    {loading && <p role="status">Đang tải lịch mới nhất…</p>}
    {error && <UserNotice error message={error} />}
    {!loading && schedule && <form onSubmit={save}>
      <p className="font-bold break-words">{schedule.title}</p>
      <UserNotice message={`Thay đổi này áp dụng cho bài đăng và toàn bộ ${schedule.matchingCount} matching thuộc bài, không chỉ cặp đang chọn.`} />
      <p className="op-muted mt-3">Múi giờ: {schedule.timeZone === "Asia/Ho_Chi_Minh" ? "Việt Nam (UTC+7)" : schedule.timeZone}. Có thể chọn ngày trong quá khứ. Lý do được lưu trong nhật ký quản trị.</p>
      <fieldset disabled={busy} className="min-w-0">
        <div className="op-field-grid"><label>Bắt đầu<input type="datetime-local" step="1" required value={startAt} onChange={e => setStartAt(e.target.value)} /></label><label>Kết thúc<input type="datetime-local" step="1" required value={endAt} onChange={e => setEndAt(e.target.value)} /></label></div>
        <label>Lý do điều chỉnh<textarea rows={3} required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <p className="op-muted mt-3">Mốc mở/đóng đánh giá sẽ dịch theo ngày kết thúc mới, giữ thời gian chờ của từng matching. Đổi về quá khứ có thể khiến cửa sổ đánh giá đã hết hạn. Các đánh giá đã gửi được giữ lại.</p>
        <p className="op-muted mt-2">Phí, hạn thanh toán, trạng thái kết nối và thời điểm chấp nhận không thay đổi. Người liên quan sẽ nhận thông báo lịch mới.</p>
        <div className="op-modal-actions"><button type="button" className="op-button secondary" onClick={reload}>Tải lại lịch</button><button className="op-button" disabled={!reason.trim()}>{busy ? "Đang lưu…" : "Lưu lịch cho toàn bộ matching"}</button></div>
      </fieldset>
    </form>}
    {!loading && !schedule && <button type="button" className="op-button secondary" onClick={reload}>Thử lại</button>}
  </OperatorModal>;
}
