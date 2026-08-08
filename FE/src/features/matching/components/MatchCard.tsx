import { Link } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import type { JobMatch } from "../../../types/matching";
import { budgetLabel, formatJobDate, formatVnd } from "../../jobs/utils/jobFormat";

interface MatchCardProps {
  match: JobMatch;
  perspective: "CONSUMER" | "PROVIDER";
}

export default function MatchCard({ match, perspective }: MatchCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        {match.counterpart.avatarUrl ? (
          <img src={match.counterpart.avatarUrl} alt={match.counterpart.fullName} className="h-12 w-12 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#dff2f5] text-lg font-black text-[#007f95]">{match.counterpart.fullName.charAt(0).toUpperCase()}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{match.counterpart.fullName}</p>
              <p className="mt-0.5 text-xs font-bold text-slate-400">{perspective === "CONSUMER" ? "Người nhận việc" : "Chủ bài"}</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">Đã Matching</span>
          </div>
          <h3 className="mt-4 line-clamp-2 text-base font-black">{match.jobTitle}</h3>
          <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 min-[440px]:grid-cols-2">
            <span className="flex items-start gap-2"><AppIcon name="calendar" className="mt-0.5 h-4 w-4 shrink-0 text-[#007f95]" />{formatJobDate(match.scheduledDate, match.startTime)}</span>
            <span className="flex items-start gap-2"><AppIcon name="location" className="mt-0.5 h-4 w-4 shrink-0 text-[#007f95]" /><span className="line-clamp-2">{match.location}</span></span>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 min-[440px]:flex-row min-[440px]:items-center min-[440px]:justify-between">
            <span className="text-sm font-black text-[#007f95]">{formatVnd(match.budgetAmount)} · {budgetLabel(match.budgetType)}</span>
            <div className="flex flex-wrap gap-2">
              {match.chatUnlocked ? (
                <Link to={`/messages/match/${match.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-extrabold text-emerald-700"><AppIcon name="chat" className="h-4 w-4" /> Nhắn tin</Link>
              ) : (
                <Link to={`/matches/${match.id}/payment`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#007f95] px-3 text-[11px] font-extrabold text-white"><AppIcon name="send" className="h-4 w-4" /> Phí kết nối</Link>
              )}
              {match.connectionSucceeded && (
                <Link to={`/matches/${match.id}/rating`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-[11px] font-extrabold text-amber-700"><AppIcon name="star" className="h-4 w-4" /> Đánh giá</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
