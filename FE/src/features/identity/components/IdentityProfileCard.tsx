import { Link } from "react-router-dom";
import type { Eligibility } from "../../../services/identityService";

export default function IdentityProfileCard({ state, error }: { state: Eligibility | null; error: string }) {
  const verified = state?.identityVerified === true;
  const pending = state?.identityStatus === "REVIEW_REQUIRED" || state?.identityStatus === "PROCESSING";
  const loading = !state && !error;
  return <div className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:col-span-2">
    <p className="text-xs font-bold text-slate-400">Xác minh danh tính</p>
    <div className="mt-2 flex items-start gap-2">
      <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-extrabold ${verified ? "bg-emerald-100 text-emerald-700" : loading ? "bg-slate-100 text-slate-500" : "bg-red-100 text-red-600"}`}>{verified ? "✓" : loading ? "…" : "!"}</span>
      <div className="min-w-0">
        <p className={`font-bold ${verified ? "text-emerald-700" : loading ? "text-slate-500" : "text-red-600"}`}>{loading ? "Đang kiểm tra trạng thái…" : error ? "Chưa tải được trạng thái xác minh" : verified ? "Đã xác minh" : pending ? "Chưa hoàn tất xác minh" : "Bạn chưa xác minh danh tính"}</p>
        {!loading && !verified && <p className="mt-1 text-sm leading-6 text-red-600">{error || (pending ? "Hồ sơ đang chờ hoàn tất xác minh. Bạn chưa thể đăng bài hoặc nhận việc." : "Vui lòng quét khuôn mặt và cung cấp CCCD hai mặt để xác minh trước khi đăng bài hoặc nhận việc.")}</p>}
        {!loading && !verified && <Link to="/onboarding?next=%2Fprofile" className="mt-2 inline-flex min-h-11 items-center font-bold text-[#007f95] underline underline-offset-4">{pending ? "Xem hồ sơ xác minh" : "Xác minh ngay"}</Link>}
      </div>
    </div>
  </div>;
}
