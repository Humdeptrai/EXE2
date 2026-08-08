import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { ratingService } from "../../../services/ratingService";
import type { MatchRatingState } from "../../../types/rating";
import { getApiErrorMessage } from "../../auth/utils/apiError";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ratingText(stars: number) {
  if (stars >= 5) return "Xuất sắc";
  if (stars >= 4) return "Rất tốt";
  if (stars >= 3) return "Ổn";
  if (stars >= 2) return "Chưa tốt";
  return "Không hài lòng";
}

export default function MatchRatingPage() {
  const { matchId = "" } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<MatchRatingState | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    setError("");
    try {
      const result = await ratingService.getMatchRatingState(matchId);
      setState(result);
      if (result.myRating) {
        setStars(result.myRating.stars);
        setComment(result.myRating.comment || "");
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể tải trạng thái đánh giá."));
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submitRating() {
    if (!state?.canRate) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await ratingService.rateMatch(state.matchId, { stars, comment: comment.trim() });
      setNotice("Đã gửi đánh giá. Cảm ơn bạn đã đóng góp vào độ tin cậy của cộng đồng.");
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể gửi đánh giá lúc này."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="grid min-h-[55dvh] place-items-center rounded-3xl border border-slate-200 bg-white text-sm font-bold text-slate-500">Đang tải đánh giá...</div>;
  }

  if (!state) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500"><AppIcon name="info" className="h-7 w-7" /></div>
        <h1 className="mt-4 text-xl font-black">Không thể mở đánh giá</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{error || "Matching không tồn tại hoặc bạn không có quyền truy cập."}</p>
        <button type="button" onClick={() => navigate(-1)} className="mt-5 min-h-11 rounded-xl bg-[#007f95] px-5 text-sm font-extrabold text-white">Quay lại</button>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-6">
      <section className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex min-h-10 items-center gap-2 text-sm font-extrabold text-[#007f95]"><AppIcon name="arrow-left" className="h-4 w-4" /> Quay lại</button>
        <span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide ${state.alreadyRated ? "bg-emerald-100 text-emerald-700" : state.canRate ? "bg-[#e5f3f6] text-[#007f95]" : "bg-amber-100 text-amber-700"}`}>
          {state.alreadyRated ? "Đã đánh giá" : state.canRate ? "Có thể đánh giá" : "Chưa đến thời điểm"}
        </span>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#789198]">Đánh giá sau kết nối</p>
        <div className="mt-4 flex items-center gap-4">
          {state.counterpart.avatarUrl ? (
            <img src={state.counterpart.avatarUrl} alt={state.counterpart.fullName} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#dff2f5] text-xl font-black text-[#007f95]">{state.counterpart.fullName.charAt(0).toUpperCase()}</div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black sm:text-2xl">{state.counterpart.fullName}</h1>
            <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-500">{state.jobTitle}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl bg-slate-50 py-4 text-center">
          <div className="px-2"><p className="text-lg font-black text-[#007f95]">{state.counterpartReputation.overall.averageRating == null ? "—" : state.counterpartReputation.overall.averageRating.toFixed(1)}</p><p className="mt-1 text-[10px] font-bold text-slate-500">Điểm uy tín</p></div>
          <div className="px-2"><p className="text-lg font-black text-[#007f95]">{state.counterpartReputation.overall.ratingCount}</p><p className="mt-1 text-[10px] font-bold text-slate-500">Đánh giá</p></div>
          <div className="px-2"><p className="text-lg font-black text-[#007f95]">{state.counterpartReputation.overall.successfulMatchCount}</p><p className="mt-1 text-[10px] font-bold text-slate-500">Kết nối thành công</p></div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div>}

      {!state.connectionSucceeded ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-black text-amber-900">Chưa thể đánh giá</h2>
          <p className="mt-2 text-sm leading-6 text-amber-800">Hai phía phải hoàn tất phí kết nối trước khi Matching được tính là kết nối thành công.</p>
          <Link to={`/matches/${state.matchId}/payment`} className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-[#007f95] px-4 text-sm font-extrabold text-white">Xem trạng thái phí kết nối</Link>
        </section>
      ) : !state.ratingWindowOpen ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-black text-amber-900">Đánh giá sẽ mở sau thời gian công việc 1 giờ</h2>
          <p className="mt-2 text-sm leading-6 text-amber-800">Thời điểm có thể đánh giá: <strong>{formatDateTime(state.ratingEligibleAt)}</strong>. Hệ thống không cho đánh giá trước mốc này.</p>
          <button type="button" onClick={() => void load()} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 text-sm font-extrabold text-amber-800"><AppIcon name="refresh" className="h-4 w-4" /> Cập nhật trạng thái</button>
        </section>
      ) : state.alreadyRated && state.myRating ? (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <h2 className="font-black text-emerald-900">Đánh giá của bạn</h2>
          <div className="mt-4 flex gap-1 text-amber-500" aria-label={`${state.myRating.stars} sao`}>
            {Array.from({ length: 5 }, (_, index) => <AppIcon key={index} name="star" className={`h-7 w-7 ${index < state.myRating!.stars ? "fill-current" : "text-slate-300"}`} />)}
          </div>
          <p className="mt-2 font-black text-emerald-900">{ratingText(state.myRating.stars)}</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-emerald-800">{state.myRating.comment || "Bạn không để lại nhận xét."}</p>
          <p className="mt-4 text-xs font-bold text-emerald-700">Đã gửi lúc {formatDateTime(state.myRating.ratedAt)}. Mỗi phía chỉ đánh giá một lần cho mỗi Matching.</p>
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black">Trải nghiệm của bạn thế nào?</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Chọn từ 1 đến 5 sao. Đánh giá này sẽ đóng góp vào uy tín của {state.counterpart.fullName}.</p>
          <div className="mt-5 flex justify-center gap-2 sm:gap-3">
            {Array.from({ length: 5 }, (_, index) => {
              const value = index + 1;
              const active = value <= stars;
              return (
                <button key={value} type="button" onClick={() => setStars(value)} aria-label={`${value} sao`} className={`grid h-12 w-12 place-items-center rounded-2xl border transition sm:h-14 sm:w-14 ${active ? "border-amber-300 bg-amber-50 text-amber-500" : "border-slate-200 text-slate-300 hover:border-amber-200"}`}>
                  <AppIcon name="star" className={`h-7 w-7 sm:h-8 sm:w-8 ${active ? "fill-current" : ""}`} />
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-center text-sm font-black text-slate-700">{stars}/5 · {ratingText(stars)}</p>
          <label className="mt-5 block text-sm font-extrabold">Nhận xét <span className="font-medium text-slate-400">(không bắt buộc)</span>
            <textarea value={comment} onChange={(event) => setComment(event.target.value.slice(0, 500))} rows={5} placeholder="Chia sẻ ngắn về trải nghiệm làm việc cùng người này..." className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-slate-300 px-4 py-3 text-base font-medium leading-6 outline-none focus:border-[#007f95] focus:ring-2 focus:ring-[#cbe9ed]" />
            <span className="mt-1 block text-right text-xs font-bold text-slate-400">{comment.length}/500</span>
          </label>
          <button type="button" disabled={busy || !state.canRate} onClick={() => void submitRating()} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#007f95] px-5 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">
            <AppIcon name="star" className="h-5 w-5" /> {busy ? "Đang gửi..." : "Gửi đánh giá"}
          </button>
        </section>
      )}
    </div>
  );
}
