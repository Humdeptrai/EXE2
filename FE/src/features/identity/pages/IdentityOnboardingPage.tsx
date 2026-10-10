import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { identityService, safeNext, type Eligibility, type MyIdentity } from "../../../services/identityService";
import UserNotice from "../../../components/feedback/UserNotice";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import "./FaceComparisonPage.css";
export default function IdentityOnboardingPage() {
  const [params] = useSearchParams(); const next = safeNext(params.get("next"));
  const [state, setState] = useState<Eligibility | null>(null); const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  const [checking, setChecking] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [details, setDetails] = useState<MyIdentity | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setChecking(true); setFeedback(""); setError("");
    void Promise.all([identityService.eligibility(controller.signal), identityService.mine(controller.signal)])
      .then(([current, personal]) => {
        if (controller.signal.aborted) return;
        setState(current); setDetails(personal);
        if (retry > 0) setFeedback(current.identityVerified
          ? "Đã kiểm tra: danh tính của bạn đã được xác minh."
          : current.identityStatus === "REVIEW_REQUIRED"
          ? "Đã kiểm tra: hồ sơ cần kiểm tra bổ sung, chưa được xác minh tự động. Chờ thêm sẽ không tự chuyển thành đã xác minh."
          : current.identityStatus === "REJECTED"
          ? "Đã kiểm tra: hồ sơ chưa đạt. Các bước đã lưu được giữ lại; hãy bổ sung phần được yêu cầu."
          : current.identityStatus === "PROCESSING"
          ? "Đã kiểm tra: hệ thống vẫn đang xử lý hồ sơ."
          : "Đã kiểm tra: bạn chưa hoàn tất xác minh danh tính.");
      }).catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e, "Không kiểm tra được trạng thái xác thực.")); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [retry]);
  if (state?.eligible) return <Navigate to={next} replace />;
  if (state && !state.profileComplete) return <Navigate to={`/profile?onboarding=1&next=${encodeURIComponent(next)}`} replace />;
  const pending = state?.identityStatus === "REVIEW_REQUIRED" || state?.identityStatus === "PROCESSING";
  return <main className="hf-face hf-onboarding">
    <header><span>HOÀN THIỆN TÀI KHOẢN · BƯỚC 2</span><h1>{pending ? "Theo dõi xác thực danh tính" : "Xác thực để sẵn sàng làm việc"}</h1><p>Thông tin cơ bản đã hoàn tất. Tiếp theo, quét khuôn mặt, chụp selfie trực tiếp và cung cấp ảnh hai mặt CCCD.</p></header>
    {error && <><UserNotice error message={error} /><button onClick={() => { setError(""); setRetry(n => n + 1); }}>Thử lại</button></>}
    {checking && <p role="status" aria-live="polite">Đang kiểm tra hồ sơ…</p>}
    {feedback && <p role="status" aria-live="polite" className="rounded-xl border border-[#007f95]/20 bg-[#007f95]/5 p-4 text-[#007f95]">{feedback}</p>}
    {details?.verification.reason && !state?.identityVerified && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">Lý do: {details.verification.reason}</p>}
    {state && <section className="hf-face-scan"><h2>{pending ? "Hồ sơ đang cần xác thực" : "Chuẩn bị trước khi bắt đầu"}</h2>
      {pending ? <p>Hồ sơ chưa đủ điều kiện xác minh tự động. Bạn có thể chụp lại CCCD và quét lại hoặc nhờ ADMIN kiểm tra bổ sung. Trong thời gian này, bạn chưa thể đăng hoặc nhận việc.</p> : <ul><li>CCCD của bạn, chụp rõ cả mặt trước và mặt sau.</li><li>Camera hoạt động, khuôn mặt đủ sáng và không bị che.</li><li>Thực hiện hướng dẫn quay đầu, sau đó chụp selfie nhìn thẳng.</li></ul>}
      <p>Bạn có thể chọn <strong>Để sau</strong> để khám phá website, rồi quay lại <strong>Hồ sơ → Xác thực danh tính</strong>. Đăng và nhận việc yêu cầu đầy đủ thông tin hồ sơ và xác thực hoàn tất.</p>
      <div className="hf-onboarding-actions"><Link className="hf-onboarding-primary" to={`/face-comparison?onboarding=1&next=${encodeURIComponent(next)}`}>{pending ? "Gửi lại hồ sơ" : "Bắt đầu"}</Link><Link className="hf-onboarding-secondary" to={next} replace>Để sau</Link></div>
      <button disabled={checking} onClick={() => { setError(""); setRetry(n => n + 1); }}>{checking ? "Đang kiểm tra…" : "Kiểm tra lại trạng thái"}</button><small>Ảnh CCCD được lưu riêng tư, chỉ ADMIN được xem.</small>
    </section>}
  </main>;
}
