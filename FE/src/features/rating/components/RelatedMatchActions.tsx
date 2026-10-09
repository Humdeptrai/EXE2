import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ratingService } from "../../../services/ratingService";
import type { MatchRatingState } from "../../../types/rating";
import UserNotice from "../../../components/feedback/UserNotice";
import { getApiErrorMessage } from "../../auth/utils/apiError";
export default function RelatedMatchActions({ jobId, counterpartId }: { jobId: string; counterpartId?: string }) {
  const [items, setItems] = useState<MatchRatingState[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    ratingService.forJob(jobId).then(data => { if (active) setItems(data); })
      .catch(e => { if (active) setError(getApiErrorMessage(e, "Không tải được trạng thái matching.")); });
    return () => { active = false; };
  }, [jobId]);
  if (error) return <UserNotice message={error} error />;
  return <>{items.filter(item => !counterpartId || item.counterpart.id === counterpartId).map(item => <section key={item.matchId} className="rounded-2xl border border-[#c5e4e8] bg-[#f2fafb] p-4">
    <h3 className="font-extrabold text-[#007f95]">Matching của bạn</h3>
    <p className="mt-2 text-sm text-slate-600">{item.alreadyRated ? "Bạn đã đánh giá kết nối này." : item.ratingExpired ? "Đã hết hạn đánh giá." : item.canRate ? "Bạn có thể đánh giá đối phương." : `Đánh giá mở từ ${new Date(item.ratingEligibleAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}, khi hai bên đã trả đủ phí.`}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <Link to={`/matches/${item.matchId}/rating`} className="inline-flex min-h-11 items-center rounded-xl bg-[#007f95] px-4 text-sm font-bold text-white">{item.alreadyRated ? "Xem đánh giá" : "Đánh giá / xem thời hạn"}</Link>
      {item.canReport && <Link to={`/reports?targetType=MATCH&targetId=${item.matchId}`} className="inline-flex min-h-11 items-center rounded-xl border border-[#b9dde3] bg-white px-4 text-sm font-bold text-[#007f95]">Báo cáo đối tác</Link>}
    </div>
  </section>)}</>;
}
