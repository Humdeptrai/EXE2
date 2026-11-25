import { useEffect, useState, type FormEvent } from "react";
import api from "../../../config/axios";
import type { ApiResponse } from "../../../types/api";
import UserNotice from "../../../components/feedback/UserNotice";
import { AppIcon } from "../../../components/ui/AppIcon";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import { PageHeading } from "../components/OperatorUi";

type Policy = { registrationEmailOtpEnabled: boolean };

export default function RegistrationSettingsPage() {
  const [enabled, setEnabled] = useState(false);
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
      const required = response.data.result.registrationEmailOtpEnabled === true;
      setEnabled(required); setSaved(required); setError("");
    }).catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e, "Không tải được cấu hình đăng ký.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || busy || saved === null || saved === enabled) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await api.patch<ApiResponse<Policy>>("/admin/settings/registration-email", { registrationEmailOtpEnabled: enabled });
      const required = response.data.result.registrationEmailOtpEnabled === true;
      setEnabled(required); setSaved(required);
      setMessage(required ? "Đã bật OTP email: đăng ký mới cần xác thực email." : "Đã tắt OTP email: đăng ký mới không cần xác thực hộp thư.");
    } catch (e) { setError(getApiErrorMessage(e, "Không lưu được cấu hình đăng ký.")); }
    finally { setBusy(false); }
  }
  return <div>
    <PageHeading title="Đăng ký & xác thực email" description="Quản lý yêu cầu OTP email khi tạo tài khoản mới." />
    {error && <UserNotice error message={error} />}
    {message && <UserNotice tone="success" message={message} onClose={() => setMessage("")} />}
    {loading ? <p role="status">Đang tải cấu hình…</p> : saved === null ? <button type="button" className="op-button secondary" onClick={() => { setLoading(true); setError(""); setRevision(value => value + 1); }}>Thử lại</button> :
      <div className="op-settings-layout">
        <form className="op-card" onSubmit={save}>
          <header><div><h2>Xác thực email đăng ký</h2><p>Chỉ áp dụng cho tài khoản đăng ký mới bằng email.</p></div></header>
          <label className="op-switch-row"><span><strong>Bắt buộc OTP email khi đăng ký</strong><small>Bật: gửi mã tới email và nhập đúng OTP mới tạo tài khoản. Tắt: chỉ cần email đúng định dạng, không cần truy cập hộp thư. Không hỗ trợ đăng ký bằng số điện thoại.</small></span><input type="checkbox" aria-label="Bắt buộc OTP email khi đăng ký" checked={enabled} disabled={busy} onChange={e => { setEnabled(e.target.checked); setMessage(""); }} /></label>
          <p className="op-muted">Tài khoản cũ vẫn đăng nhập bình thường. Đăng nhập Google dùng email đã được Google xác minh và không cần OTP bổ sung.</p>
          {saved !== enabled && <p className="op-muted mt-3" role="status">Có thay đổi chưa lưu.</p>}
          <div className="op-form-footer mt-5"><button className="op-button" disabled={busy || saved === enabled}>{busy ? "Đang lưu…" : "Lưu cấu hình đăng ký"}</button></div>
        </form>
        <aside className="op-card op-setting-note"><AppIcon name="info" className="op-kpi-icon" /><h2>Mã gửi tới hộp thư</h2><p>OTP gồm 6 số, hết hạn sau 10 phút và chỉ dùng một lần. Gửi lại sau 60 giây, tối đa 5 lần mỗi giờ cho một email. Nhập sai 5 lần phải lấy mã mới.</p><p>Cần cấu hình dịch vụ gửi email trước khi bật. Xác thực OTP chứng minh người đăng ký truy cập được hộp thư.</p></aside>
      </div>}
  </div>;
}
