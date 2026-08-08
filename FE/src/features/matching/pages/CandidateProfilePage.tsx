import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { matchingService } from "../../../services/matchingService";
import type { Candidate } from "../../../types/matching";
import { getApiErrorMessage } from "../../auth/utils/apiError";

function ratingLabel(candidate: Candidate) {
  return candidate.hiringInsights.averageRating == null
    ? "Chưa có"
    : `${candidate.hiringInsights.averageRating.toFixed(1)} / 5`;
}

export default function CandidateProfilePage() {
  const { jobId = "", interestId = "" } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!jobId || !interestId) return;
    matchingService.getCandidate(jobId, interestId)
      .then(setCandidate)
      .catch((requestError) => setError(getApiErrorMessage(requestError, "Không thể tải hồ sơ ứng viên.")))
      .finally(() => setLoading(false));
  }, [interestId, jobId]);

  async function decide(action: "accept" | "reject") {
    if (!candidate || busy) return;
    const confirmation = action === "accept"
      ? "Chấp nhận ứng viên này và tạo Matching?"
      : "Từ chối ứng viên này?";
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    setError("");
    try {
      if (action === "accept") await matchingService.acceptCandidate(jobId, candidate.interestId);
      else await matchingService.rejectCandidate(jobId, candidate.interestId);
      navigate(`/posts/${jobId}/candidates`, {
        replace: true,
        state: { notice: action === "accept" ? "Đã tạo Matching." : "Đã từ chối ứng viên." },
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể phản hồi ứng viên."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="grid min-h-[55dvh] place-items-center text-sm font-bold text-slate-500">Đang tải hồ sơ...</div>;
  if (!candidate) return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">{error || "Không tìm thấy ứng viên."}</div>;

  const insights = candidate.hiringInsights;

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-5">
      <Link to={`/posts/${jobId}/candidates`} className="inline-flex min-h-10 items-center gap-2 text-sm font-extrabold text-[#007f95]"><AppIcon name="arrow-left" className="h-4 w-4" /> Quay lại danh sách</Link>
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-b from-[#dff2f5] to-white px-5 pb-6 pt-8 text-center sm:px-8">
          <div className="mx-auto grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-[#b9d9de] to-[#7caeb7] text-3xl font-black text-white shadow-xl">
            {candidate.identityRevealed && candidate.avatarUrl ? <img src={candidate.avatarUrl} alt={candidate.displayName} className="h-full w-full object-cover" /> : <span className="blur-[2px]">HF</span>}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <h1 className="text-2xl font-black">{candidate.displayName}</h1>
            {candidate.interestLevel === "VERY_INTERESTED" && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-700"><AppIcon name="star" className="h-4 w-4 fill-current" /> Rất quan tâm</span>}
          </div>
          <p className="mt-2 text-sm text-slate-500">Danh tính và ảnh đại diện được bảo vệ cho đến khi bạn chấp nhận Matching. Uy tín và kinh nghiệm được hiển thị để hỗ trợ lựa chọn.</p>
        </div>

        <div className="space-y-5 p-5 sm:p-7">
          <section>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#6e8c93]">Uy tín khi nhận việc</p>
            <div className="mt-3 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-[#f8fbfc] py-4 text-center">
              <div className="px-2">
                <p className="text-xl font-black text-[#007f95]">{ratingLabel(candidate)}</p>
                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Điểm sao</p>
              </div>
              <div className="px-2">
                <p className="text-xl font-black text-[#007f95]">{insights.ratingCount}</p>
                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Đánh giá</p>
              </div>
              <div className="px-2">
                <p className="text-xl font-black text-[#007f95]">{insights.successfulMatchCount}</p>
                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Kết nối thành công</p>
              </div>
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-400">Điểm sao chỉ lấy các đánh giá ứng viên nhận được trong vai trò người nhận việc; số kết nối chỉ tính khi cả hai phía đã hoàn tất phí kết nối.</p>
          </section>

          <section className="rounded-2xl border border-[#c5e4e8] bg-[#f2fafb] p-4 sm:p-5">
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#547982]"><AppIcon name="briefcase" className="h-4 w-4 text-[#007f95]" /> Chuyên môn từ lịch sử kết nối</p>
            {insights.topExpertise.length > 0 ? (
              <div className="mt-4 space-y-3">
                {insights.topExpertise.map((item, index) => (
                  <div key={item.categoryId} className="flex items-center justify-between gap-3 rounded-xl border border-[#d7ecef] bg-white px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-800">#{index + 1} · {item.name}</p>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-400">Nhóm công việc đã kết nối thành công</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#e6f5f7] px-3 py-1.5 text-xs font-black text-[#007f95]">{item.successfulMatchCount} lần</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-[#b9d9de] bg-white px-4 py-4 text-sm font-bold leading-6 text-slate-500">Ứng viên chưa có lịch sử kết nối thành công. Đây có thể là thành viên mới, vì vậy hãy cân nhắc thêm phần giới thiệu và kỹ năng tự khai.</div>
            )}
          </section>

          <section>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#6e8c93]">Giới thiệu bản thân</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{candidate.bio || "Ứng viên chưa thêm phần giới thiệu."}</p>
          </section>
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f7fafc] p-4">
              <p className="flex items-center gap-2 text-xs font-extrabold text-slate-500"><AppIcon name="location" className="h-4 w-4 text-[#007f95]" /> Khu vực</p>
              <p className="mt-2 text-sm font-bold">{candidate.location || "Chưa cập nhật"}</p>
            </div>
            <div className="rounded-2xl bg-[#f7fafc] p-4">
              <p className="flex items-center gap-2 text-xs font-extrabold text-slate-500"><AppIcon name="check" className="h-4 w-4 text-[#007f95]" /> Mức độ hồ sơ</p>
              <p className="mt-2 text-sm font-bold">{candidate.profileCompleted ? "Đã hoàn thiện" : "Chưa hoàn thiện"}</p>
            </div>
          </section>
          <section>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#6e8c93]">Kỹ năng & đặc điểm tự khai</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {candidate.tags.length ? candidate.tags.map((tag) => <span key={tag} className="rounded-full bg-[#e7f5f7] px-3 py-1.5 text-xs font-extrabold text-[#007f95]">{tag}</span>) : <span className="text-sm text-slate-400">Chưa có tag hồ sơ.</span>}
            </div>
          </section>
          <div className="rounded-2xl border border-[#b9dde3] bg-[#eff9fb] p-4 text-xs font-bold leading-6 text-[#456a72]">
            Matching xác nhận hai bên muốn kết nối. Sau khi chấp nhận, người thuê thanh toán 10.000đ và người nhận việc thanh toán 5.000đ; chỉ khi cả hai hoàn tất phí kết nối thì Chat realtime mới được mở.
          </div>
        </div>
      </section>

      {candidate.interestStatus === "PENDING" && (
        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur lg:bottom-4">
          <button type="button" disabled={busy} onClick={() => void decide("reject")} className="min-h-12 rounded-xl border border-rose-200 text-sm font-extrabold text-rose-600 disabled:opacity-50">Từ chối</button>
          <button type="button" disabled={busy} onClick={() => void decide("accept")} className="min-h-12 rounded-xl bg-[#007f95] text-sm font-extrabold text-white disabled:opacity-50">Chấp nhận Matching</button>
        </div>
      )}
    </div>
  );
}
