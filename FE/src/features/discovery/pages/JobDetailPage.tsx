import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import { jobService } from "../../../services/jobService";
import type { InterestLevel, JobDiscovery, JobInteractionState } from "../../../types/job";
import { budgetLabel, formatJobDate, formatVnd } from "../../jobs/utils/jobFormat";
import JobVisual from "../components/JobVisual";

export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDiscovery | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      jobService.getDiscoveryDetail(jobId)
        .then((result) => { if (active) setJob(result); })
        .catch((requestError) => { if (active) setError(getApiErrorMessage(requestError, "Không thể tải chi tiết công việc.")); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [jobId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function updateInteraction(interaction: JobInteractionState) {
    setJob((current) => current ? { ...current, interaction } : current);
  }

  async function toggleSave() {
    if (!job || busy) return;
    setBusy(true);
    setError("");
    try {
      const state = job.interaction.saved
        ? await jobService.unsaveJob(job.id)
        : await jobService.saveJob(job.id);
      updateInteraction(state);
      setNotice(state.saved ? "Đã lưu công việc." : "Đã bỏ lưu công việc.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể cập nhật danh sách đã lưu."));
    } finally {
      setBusy(false);
    }
  }

  async function expressInterest(level: InterestLevel) {
    if (!job || busy) return;
    setBusy(true);
    setError("");
    try {
      updateInteraction(await jobService.expressInterest(job.id, level));
      setNotice(level === "VERY_INTERESTED" ? "Đã đánh dấu rất quan tâm." : "Đã gửi sự quan tâm đến chủ bài.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể gửi sự quan tâm."));
    } finally {
      setBusy(false);
    }
  }

  async function withdrawInterest() {
    if (!job || busy) return;
    setBusy(true);
    setError("");
    try {
      updateInteraction(await jobService.withdrawInterest(job.id));
      setNotice("Đã rút sự quan tâm.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể rút sự quan tâm."));
    } finally {
      setBusy(false);
    }
  }

  async function restoreSkipped() {
    if (!job || busy) return;
    setBusy(true);
    setError("");
    try {
      updateInteraction(await jobService.restoreSkippedJob(job.id));
      setNotice("Đã khôi phục công việc vào feed.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể khôi phục công việc."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="mx-auto h-[70dvh] max-w-3xl animate-pulse rounded-3xl bg-slate-200" />;

  if (!job) {
    return (
      <section className="hf-page hf-page-job-detail rounded-3xl border border-red-200 bg-white p-8 text-center">
        <h1 className="text-xl font-black">Không thể mở công việc</h1>
        <p className="mt-2 text-sm text-red-600">{error || "Công việc không còn khả dụng."}</p>
        <button type="button" onClick={() => navigate(-1)} className="mt-5 min-h-11 rounded-xl bg-[#007f95] px-5 text-sm font-extrabold text-white">Quay lại</button>
      </section>
    );
  }

  const pendingInterest = job.interaction.interestStatus === "PENDING";

  return (
    <div className="hf-page hf-page-job-detail mx-auto max-w-4xl space-y-4 pb-24 lg:pb-0">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Quay lại" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600"><AppIcon name="arrow-left" className="h-5 w-5" /></button>
        <Link to="/discover" className="text-sm font-extrabold text-[#007f95]">Về feed khám phá</Link>
      </div>

      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      <Link to={`/reports?targetType=JOB&targetId=${job.id}`} className="inline-block text-sm font-bold text-[#007f95]">Báo cáo bài đăng</Link>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative flex min-h-56 items-center justify-center overflow-hidden bg-slate-100">
          {job.media[imageIndex]?.url ? (
            <a href={job.media[imageIndex].url} target="_blank" rel="noopener noreferrer" className="block max-w-full" aria-label="Mở ảnh gốc trong tab mới">
              <JobVisual job={job} imageIndex={imageIndex} fit="original" />
            </a>
          ) : <JobVisual job={job} imageIndex={imageIndex} fit="original" /> }
          {job.media.length > 1 && (
            <>
              <button type="button" onClick={() => setImageIndex((value) => (value - 1 + job.media.length) % job.media.length)} aria-label="Ảnh trước" className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur"><AppIcon name="chevron-left" className="h-5 w-5" /></button>
              <button type="button" onClick={() => setImageIndex((value) => (value + 1) % job.media.length)} aria-label="Ảnh tiếp theo" className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur"><AppIcon name="chevron-right" className="h-5 w-5" /></button>
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">{job.media.map((media, index) => <button key={media.id} type="button" onClick={() => setImageIndex(index)} aria-label={`Mở ảnh ${index + 1}`} className={`h-2 rounded-full transition ${index === imageIndex ? "w-6 bg-white" : "w-2 bg-white/55"}`} />)}</div>
            </>
          )}
        </div>

        <div className="space-y-5 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#e8f6f8] px-3 py-1 text-[11px] font-extrabold text-[#007f95]">{job.category.name}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold text-slate-600">Cần {job.requiredWorkers} người</span>
              </div>
              <h1 className="mt-3 break-words text-2xl font-black leading-tight sm:text-3xl">{job.title}</h1>
            </div>
            <div className="shrink-0 rounded-2xl bg-[#f0f8f9] px-4 py-3 text-left sm:text-right">
              <p className="text-xl font-black text-[#007f95]">{formatVnd(job.budgetAmount)}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{budgetLabel(job.budgetType)}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl bg-[#f7f9fd] p-4"><AppIcon name="calendar" className="mt-0.5 h-5 w-5 shrink-0 text-[#007f95]" /><div><p className="text-xs font-extrabold text-slate-400">Thời gian</p><p className="mt-1 text-sm font-bold">{formatJobDate(job.scheduledDate, job.startTime)}</p></div></div>
            <div className="flex items-start gap-3 rounded-2xl bg-[#f7f9fd] p-4"><AppIcon name="location" className="mt-0.5 h-5 w-5 shrink-0 text-[#007f95]" /><div className="min-w-0"><p className="text-xs font-extrabold text-slate-400">Địa điểm</p><p className="mt-1 break-words text-sm font-bold">{job.location}</p></div></div>
          </div>

          <div>
            <h2 className="text-base font-black">Mô tả công việc</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{job.description}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-[#fbfcff] p-4 sm:p-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#789098]">Người đăng</p>
            <div className="mt-3 flex items-center gap-3">
              {job.owner.avatarUrl ? <img src={job.owner.avatarUrl} alt={job.owner.fullName} className="h-14 w-14 shrink-0 rounded-full object-cover" /> : <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#e5f4f6] text-lg font-black text-[#007f95]">{job.owner.fullName.charAt(0).toUpperCase()}</div>}
              <div className="min-w-0">
                <p className="truncate text-base font-black">{job.owner.fullName}</p>
                <p className="mt-1 truncate text-xs font-bold text-slate-500">{job.owner.location || "Chưa cập nhật khu vực"}</p>
              </div>
            </div>
            {job.owner.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{job.owner.tags.slice(0, 6).map((tag) => <span key={tag} className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm">{tag}</span>)}</div>}
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-[#eef7f9] p-3 text-xs leading-5 text-[#46646b]"><AppIcon name="info" className="mt-0.5 h-4 w-4 shrink-0" /> Thông tin liên hệ chỉ được mở sau khi hai bên matching và hoàn tất phí kết nối.</div>
          </div>
        </div>
      </section>

      <section className="hf-detail-actions fixed inset-x-0 bottom-[calc(4.7rem+env(safe-area-inset-bottom))] z-20 border-t border-slate-200 bg-white/96 p-3 backdrop-blur lg:static lg:rounded-3xl lg:border lg:p-4">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <button type="button" disabled={busy} onClick={() => void toggleSave()} aria-label={job.interaction.saved ? "Bỏ lưu" : "Lưu công việc"} className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border disabled:opacity-50 ${job.interaction.saved ? "border-[#007f95] bg-[#e8f6f8] text-[#007f95]" : "border-slate-200 bg-white text-slate-500"}`}><AppIcon name="bookmark" className={`h-5 w-5 ${job.interaction.saved ? "fill-current" : ""}`} /></button>

          {job.interaction.skipped ? (
            <button type="button" disabled={busy} onClick={() => void restoreSkipped()} className="min-h-12 flex-1 rounded-xl bg-[#007f95] px-4 text-sm font-extrabold text-white disabled:opacity-50">Khôi phục vào feed</button>
          ) : pendingInterest ? (
            <>
              <button type="button" disabled={busy} onClick={() => void withdrawInterest()} className="min-h-12 flex-1 rounded-xl border border-rose-200 bg-white px-3 text-xs font-extrabold text-rose-600 disabled:opacity-50 sm:text-sm">Rút yêu cầu</button>
              {job.interaction.interestLevel === "INTERESTED" && <button type="button" disabled={busy} onClick={() => void expressInterest("VERY_INTERESTED")} className="min-h-12 flex-1 rounded-xl bg-amber-500 px-3 text-xs font-extrabold text-white disabled:opacity-50 sm:text-sm">Rất quan tâm</button>}
            </>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={() => void expressInterest("VERY_INTERESTED")} className="min-h-12 flex-1 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-extrabold text-amber-700 disabled:opacity-50 sm:text-sm">Rất quan tâm</button>
              <button type="button" disabled={busy} onClick={() => void expressInterest("INTERESTED")} className="min-h-12 flex-[1.4] rounded-xl bg-[#007f95] px-3 text-xs font-extrabold text-white disabled:opacity-50 sm:text-sm">Quan tâm công việc</button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
