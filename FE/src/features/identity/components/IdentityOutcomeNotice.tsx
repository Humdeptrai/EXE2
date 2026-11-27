import { Link } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import type { IdentityOutcome } from "../../../services/identityService";
import { notificationPresentation } from "../../notifications/utils/notificationPresentation";

export default function IdentityOutcomeNotice({ outcome, previousVerified = false, showActions = true }: { outcome: IdentityOutcome | null; previousVerified?: boolean; showActions?: boolean }) {
  if (!outcome || !["REJECTED", "REVIEW_REQUIRED", "ERROR", "VERIFIED"].includes(outcome.status)) return null;
  const reason = outcome.reason || "Hồ sơ chưa đủ điều kiện xác minh tự động. Vui lòng kiểm tra và gửi yêu cầu xét duyệt bổ sung.";
  const document = /[Tt]rùng số CCCD/.test(reason), face = /[Tt]rùng khuôn mặt/.test(reason);
  const type = outcome.status === "VERIFIED" ? "IDENTITY_APPROVED" : document && face ? "IDENTITY_DUPLICATE_BOTH" : document ? "IDENTITY_DUPLICATE_DOCUMENT" : face ? "IDENTITY_DUPLICATE_FACE" : outcome.status === "REJECTED" ? "IDENTITY_REJECTED" : "IDENTITY_ACTION_REQUIRED";
  const style = notificationPresentation(type);
  return <section data-identity-outcome={outcome.status} role={outcome.status === "VERIFIED" ? "status" : "alert"} className={`min-w-0 rounded-2xl border p-4 sm:col-span-2 ${style.badgeClass}`}>
    <div className="flex items-center gap-2"><span className={`rounded-full p-2 ${style.iconClass}`}><AppIcon name={style.icon} className="h-5 w-5" /></span><h3 className="font-bold">{style.label}</h3></div>
    <p className="mt-3 whitespace-pre-line break-words text-sm leading-6">{reason}</p>
    {previousVerified && outcome.status !== "VERIFIED" && <p className="mt-2 text-sm">Đây là kết quả của bản cập nhật. Hồ sơ đã xác minh trước đó vẫn được giữ nguyên.</p>}
    {outcome.status !== "VERIFIED" && <><p className="mt-2 text-sm">Các dấu tích xanh bên dưới chỉ xác nhận bước hoặc ảnh đã lưu, không có nghĩa hồ sơ đã được duyệt.</p>{showActions && <div className="mt-2 flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center font-bold underline" to="/face-comparison">Kiểm tra và thực hiện lại</Link><Link className="inline-flex min-h-11 items-center font-bold underline" to="/onboarding?next=%2Fprofile">Gửi yêu cầu kiểm tra danh tính</Link></div>}</>}
  </section>;
}
