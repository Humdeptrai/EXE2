import { useEffect, useState, type FormEvent } from "react";
import api from "../../../config/axios";
import type { ApiResponse } from "../../../types/api";
import UserNotice from "../../../components/feedback/UserNotice";
import { AppIcon } from "../../../components/ui/AppIcon";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import { PageHeading } from "../components/OperatorUi";

type Policy = { matchingRequirementsEnabled: boolean };

export default function MatchingSettingsPage() {
  const [enabled, setEnabled] = useState(true);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void api.get<ApiResponse<Policy>>("/admin/settings", { signal: controller.signal }).then(response => {
      if (controller.signal.aborted) return;
      const required = response.data.result.matchingRequirementsEnabled !== false;
      setEnabled(required); setSaved(required); setError("");
    }).catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e, "Không tải được điều kiện matching.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || busy || saved === null || saved === enabled) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await api.patch<ApiResponse<Policy>>("/admin/settings/matching", { matchingRequirementsEnabled: enabled });
      const required = response.data.result.matchingRequirementsEnabled !== false;
      setEnabled(required); setSaved(required);
      setMessage(required ? "Đã bật điều kiện hồ sơ và xác thực khi đăng / nhận việc." : "Đã bỏ yêu cầu hồ sơ và xác thực khi đăng / nhận việc. Phí kết nối vẫn áp dụng.");
    } catch (e) { setError(getApiErrorMessage(e, "Không lưu được điều kiện matching.")); }
    finally { setBusy(false); }
  }
  return <div>
    <PageHeading title="Điều kiện matching" description="Quản lý yêu cầu hồ sơ và xác thực trước khi đăng việc, gửi quan tâm hoặc chấp nhận ứng viên." />
    {error && <UserNotice error message={error} />}
    {message && <UserNotice tone="success" message={message} onClose={() => setMessage("")} />}
    {loading ? <p role="status">Đang tải cấu hình…</p> : saved === null ? <button type="button" className="op-button secondary" onClick={() => { setLoading(true); setError(""); setRevision(value => value + 1); }}>Thử lại</button> :
      <div className="op-settings-layout">
        <form className="op-card" onSubmit={save}>
          <header><div><h2>Hồ sơ & xác thực tài khoản</h2><p>Áp dụng cho cả người thuê và người nhận việc.</p></div></header>
          <label className="op-switch-row"><span><strong>Bắt buộc hồ sơ và xác thực khi matching</strong><small>Bật: cần họ tên, số điện thoại, khu vực, CCCD và selfie đã xác minh. Tắt: tài khoản đã đăng ký, đang hoạt động được đăng việc, gửi quan tâm và chấp nhận ứng viên.</small></span><input type="checkbox" aria-label="Bắt buộc hồ sơ và xác thực khi matching" checked={enabled} disabled={busy} onChange={e => { setEnabled(e.target.checked); setMessage(""); }} /></label>
          <p className="op-muted">Bật lại sẽ kiểm tra điều kiện cho các thao tác mới. Matching, thanh toán đã tạo và trạng thái xác minh thực tế của user được giữ nguyên.</p>
          {saved !== enabled && <p className="op-muted mt-3" role="status">Có thay đổi chưa lưu.</p>}
          <div className="op-form-footer mt-5"><button className="op-button" disabled={busy || saved === enabled}>{busy ? "Đang lưu…" : "Lưu điều kiện matching"}</button></div>
        </form>
        <aside className="op-card op-setting-note"><AppIcon name="info" className="op-kpi-icon" /><h2>Phí kết nối vẫn áp dụng</h2><p>Công tắc này chỉ thay đổi yêu cầu hồ sơ và xác thực. Cả hai bên vẫn phải thanh toán phí kết nối từ ví để mở chat và thông tin liên hệ.</p><p>Cấu hình phí, thời hạn thanh toán và đánh giá nằm tại trang Phí & thời gian.</p></aside>
      </div>}
  </div>;
}
