import UserNotice from "../../../components/feedback/UserNotice";
import { EmptyArtwork } from "../../../components/ui/EmptyArtwork";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { jobService } from "../../../services/jobService";
import { matchingService } from "../../../services/matchingService";
import type { JobPost, PageResponse } from "../../../types/job";
import type { JobMatch, MatchPage } from "../../../types/matching";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import { formatJobDate } from "../../jobs/utils/jobFormat";
import MatchCard from "../components/MatchCard";

const emptyJobs: PageResponse<JobPost> = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true };
const emptyMatches: MatchPage = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true };

export default function CandidatesOverviewPage() {
  const [jobs, setJobs] = useState(emptyJobs);
  const [matches, setMatches] = useState<MatchPage>(emptyMatches);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [jobResult, matchResult] = await Promise.all([
        jobService.getMine("ACTIVE", 0, 50),
        matchingService.getConsumerMatches(0, 50),
      ]);
      setJobs(jobResult);
      setMatches(matchResult);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể tải không gian ứng viên."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pendingTotal = jobs.content.reduce((sum, job) => sum + job.applicantCount, 0);
  const activeMatchTotal = matches.totalElements;

  if (loading) return <div className="grid min-h-[50dvh] place-items-center rounded-3xl border border-slate-200 bg-white text-sm font-bold text-slate-500">Đang tải ứng viên...</div>;

  return (
    <div className="hf-page hf-page-candidates-overview space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#779198] sm:text-xs">Chế độ thuê việc</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Ứng viên & kết nối</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">Duyệt hồ sơ theo kiểu swipe và theo dõi những người bạn đã chấp nhận.</p>
        </div>
        <Link to="/posts" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600"><AppIcon name="list" className="h-4 w-4" /> Quản lý bài đăng</Link>
      </section>

      {error && <UserNotice message={error} error />}

      <section className="grid gap-3 min-[420px]:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-2xl font-black text-[#007f95]">{pendingTotal}</p><p className="mt-1 text-xs font-bold text-slate-500">Ứng viên đang chờ</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-2xl font-black text-emerald-600">{activeMatchTotal}</p><p className="mt-1 text-xs font-bold text-slate-500">Matching đang hoạt động</p></article>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#799097]">Hàng chờ ứng viên</p><h2 className="mt-1 text-lg font-black sm:text-xl">Theo từng công việc</h2></div>
        </div>
        {jobs.content.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center"><EmptyArtwork /><AppIcon name="users" className="mx-auto h-10 w-10 text-slate-300" /><h3 className="mt-4 font-black">Chưa có bài đang tuyển</h3><Link to="/jobs/new" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#007f95] px-5 text-sm font-extrabold text-white">Đăng việc mới</Link></div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {jobs.content.map((job) => {
              const full = job.matchedCount >= job.requiredWorkers;
              return (
                <article key={job.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-wide text-[#6e8c93]">{job.category.name}</p><h3 className="mt-1 line-clamp-2 text-lg font-black">{job.title}</h3></div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${full ? "bg-emerald-100 text-emerald-700" : "bg-[#e7f5f7] text-[#007f95]"}`}>{full ? "Đủ người" : `${job.matchedCount}/${job.requiredWorkers} matched`}</span>
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500"><AppIcon name="calendar" className="h-4 w-4 text-[#007f95]" />{formatJobDate(job.scheduledDate, job.startTime)}</p>
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#f7fafc] p-3"><div><p className="text-xl font-black text-[#007f95]">{job.applicantCount}</p><p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">đang chờ</p></div><Link to={`/posts/${job.id}/candidates`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#007f95] px-4 text-xs font-extrabold text-white"><AppIcon name="users" className="h-4 w-4" /> Xem ứng viên</Link></div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#799097]">Đã chấp nhận</p><h2 className="mt-1 text-lg font-black sm:text-xl">Matching hiện tại</h2></div>
        {matches.content.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"><EmptyArtwork />Chưa có Matching nào. Khi bạn quét phải một ứng viên, kết nối sẽ xuất hiện tại đây.</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">{matches.content.map((match: JobMatch) => <MatchCard key={match.id} match={match} perspective="CONSUMER" />)}</div>
        )}
      </section>
    </div>
  );
}
