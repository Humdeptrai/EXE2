import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import { jobService } from "../../../services/jobService";
import type { JobDiscovery, PageResponse } from "../../../types/job";
import JobListCard from "../components/JobListCard";

const emptyPage: PageResponse<JobDiscovery> = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true };

export default function SkippedJobsPage() {
  const [result, setResult] = useState<PageResponse<JobDiscovery>>(emptyPage);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (selectedPage: number) => {
    setLoading(true);
    setError("");
    try {
      setResult(await jobService.getSkipped(selectedPage, 8));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể tải lịch sử đã bỏ qua."));
      setResult(emptyPage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(page); }, 0);
    return () => window.clearTimeout(timer);
  }, [load, page]);

  async function restore(jobId: string) {
    setBusyId(jobId);
    setError("");
    try {
      await jobService.restoreSkippedJob(jobId);
      await load(page);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể khôi phục công việc."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="flex items-start gap-3">
        <Link to="/discover" aria-label="Quay lại feed" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600"><AppIcon name="arrow-left" className="h-5 w-5" /></Link>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#779198] sm:text-xs">Lịch sử quét trái</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Công việc đã bỏ qua</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">Khôi phục một công việc để nó có thể xuất hiện lại trong feed.</p>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      {loading ? (
        <div className="grid gap-4"><div className="h-52 animate-pulse rounded-3xl bg-slate-200" /><div className="h-52 animate-pulse rounded-3xl bg-slate-200" /></div>
      ) : result.content.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12">
          <AppIcon name="undo" className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-black">Chưa có công việc bị bỏ qua</h2>
          <Link to="/discover" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#007f95] px-5 text-sm font-extrabold text-white">Quay lại khám phá</Link>
        </section>
      ) : (
        <div className="space-y-4">
          {result.content.map((job) => (
            <JobListCard key={job.id} job={job} badge="Đã bỏ qua" actions={
              <button type="button" disabled={busyId === job.id} onClick={() => void restore(job.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#007f95] px-4 text-xs font-extrabold text-white disabled:opacity-50"><AppIcon name="undo" className="h-4 w-4" /> Khôi phục</button>
            } />
          ))}
          {result.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button type="button" disabled={result.first} onClick={() => setPage((value) => Math.max(value - 1, 0))} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white disabled:opacity-40"><AppIcon name="chevron-left" className="h-5 w-5" /></button>
              <span className="text-sm font-extrabold text-slate-500">Trang {result.page + 1}/{result.totalPages}</span>
              <button type="button" disabled={result.last} onClick={() => setPage((value) => value + 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white disabled:opacity-40"><AppIcon name="chevron-right" className="h-5 w-5" /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
