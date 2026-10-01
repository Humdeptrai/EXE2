import type { PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import type { Candidate } from "../../../types/matching";

interface CandidateSwipeCardProps {
  candidate: Candidate;
  jobId: string;
  dragX?: number;
  dragging?: boolean;
  exiting?: "left" | "right" | null;
  onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel?: (event: ReactPointerEvent<HTMLElement>) => void;
}

function ratingLabel(candidate: Candidate) {
  return candidate.hiringInsights.averageRating == null
    ? "Mới"
    : `${candidate.hiringInsights.averageRating.toFixed(1)}★`;
}

export default function CandidateSwipeCard({
  candidate,
  jobId,
  dragX = 0,
  dragging = false,
  exiting = null,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: CandidateSwipeCardProps) {
  const exitX = exiting === "left" ? -760 : exiting === "right" ? 760 : dragX;
  const rotation = exiting ? (exiting === "left" ? -18 : 18) : dragX / 28;
  const acceptOpacity = Math.min(Math.max(dragX / 110, 0), 1);
  const rejectOpacity = Math.min(Math.max(-dragX / 110, 0), 1);
  const insights = candidate.hiringInsights;

  return (
    <article
      className={`hf-candidate-card relative isolate overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_24px_70px_rgba(22,66,78,0.18)] select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{
        transform: `translateX(${exitX}px) rotate(${rotation}deg)`,
        transition: dragging ? "none" : "transform 220ms cubic-bezier(.2,.8,.2,1)",
        touchAction: "pan-y",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="relative min-h-[610px] bg-gradient-to-b from-[#dff2f5] via-white to-white p-5 sm:min-h-[650px] sm:p-7">
        <div className="absolute left-5 top-5 rotate-[-10deg] rounded-xl border-4 border-rose-500 px-4 py-2 text-xl font-black uppercase tracking-[0.16em] text-rose-500" style={{ opacity: rejectOpacity }}>
          Từ chối
        </div>
        <div className="absolute right-5 top-5 rotate-[10deg] rounded-xl border-4 border-emerald-500 px-4 py-2 text-xl font-black uppercase tracking-[0.16em] text-emerald-600" style={{ opacity: acceptOpacity }}>
          Chấp nhận
        </div>

        <div className="pt-10 text-center">
          <div className="relative mx-auto h-28 w-28 sm:h-32 sm:w-32">
            <div className="grid h-full w-full place-items-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-[#b9d9de] to-[#7caeb7] text-4xl font-black text-white shadow-xl">
              {candidate.identityRevealed && candidate.avatarUrl ? (
                <img src={candidate.avatarUrl} alt={candidate.displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="blur-[2px]">HF</span>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            <h2 className="text-xl font-black sm:text-2xl">{candidate.displayName}</h2>
            {candidate.interestLevel === "VERY_INTERESTED" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
                <AppIcon name="star" className="h-3.5 w-3.5 fill-current" /> Rất quan tâm
              </span>
            )}
          </div>
          <p className="mt-1 text-xs font-bold text-slate-400">Danh tính ẩn trước kết nối. Uy tín vẫn hiển thị.</p>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white py-4 text-center shadow-sm">
          <div className="px-2">
            <p className="text-lg font-black text-[#007f95]">{ratingLabel(candidate)}</p>
            <p className="mt-1 text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Đánh giá</p>
          </div>
          <div className="px-2">
            <p className="text-lg font-black text-[#007f95]">{insights.ratingCount}</p>
            <p className="mt-1 text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Lượt đánh giá</p>
          </div>
          <div className="px-2">
            <p className="text-lg font-black text-[#007f95]">{insights.successfulMatchCount}</p>
            <p className="mt-1 text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Kết nối</p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-[#cbe7eb] bg-[#f2fafb] p-4 text-left">
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#547982]"><AppIcon name="briefcase" className="h-4 w-4 text-[#007f95]" /> Kinh nghiệm nổi bật</p>
          {insights.topExpertise.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {insights.topExpertise.map((item) => (
                <span key={item.categoryId} className="inline-flex items-center gap-1.5 rounded-full border border-[#bfe0e5] bg-white px-3 py-1.5 text-xs font-extrabold text-[#136b79]">
                  {item.name} <span className="text-[#789198]">· {item.successfulMatchCount}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs font-bold leading-5 text-slate-400">Chưa có lịch sử kết nối.</p>
          )}
        </div>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-[#f8fbfc] p-4 text-left sm:p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6e8c93]">Giới thiệu</p>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
            {candidate.bio || "Chưa thêm giới thiệu."}
          </p>
        </div>

        <div className="mt-4 grid gap-3 min-[420px]:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-extrabold text-slate-500"><AppIcon name="location" className="h-4 w-4 text-[#007f95]" /> Khu vực</p>
            <p className="mt-2 line-clamp-2 text-sm font-bold">{candidate.location || "Chưa cập nhật"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-extrabold text-slate-500"><AppIcon name="check" className="h-4 w-4 text-[#007f95]" /> Hồ sơ</p>
            <p className="mt-2 text-sm font-bold">{candidate.profileCompleted ? "Đã hoàn thiện" : "Đang bổ sung"}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6e8c93]">Kỹ năng & đặc điểm tự khai</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {candidate.tags.length > 0 ? candidate.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#e7f5f7] px-3 py-1.5 text-xs font-extrabold text-[#007f95]">{tag}</span>
            )) : <span className="text-sm text-slate-400">Chưa thêm kỹ năng.</span>}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            to={`/posts/${jobId}/candidates/${candidate.interestId}`}
            onPointerDown={(event) => event.stopPropagation()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 hover:border-[#9acbd2]"
          >
            <AppIcon name="user" className="h-4 w-4" /> Xem hồ sơ chi tiết
          </Link>
        </div>
      </div>
    </article>
  );
}
