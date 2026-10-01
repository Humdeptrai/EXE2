import { EmptyArtwork } from "../../../components/ui/EmptyArtwork";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { jobService } from "../../../services/jobService";
import type { JobListTab, JobManagementSummary, JobPost, PageResponse } from "../../../types/job";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import { budgetLabel, formatJobDate, formatVnd, statusLabel } from "../utils/jobFormat";

const tabs: Array<{ value: JobListTab; label: string; countKey: keyof JobManagementSummary }> = [
  { value: "ACTIVE", label: "Đang đăng", countKey: "active" },
  { value: "COMPLETED", label: "Đã hoàn thành", countKey: "completed" },
  { value: "DRAFT", label: "Bản nháp", countKey: "draft" },
];

const emptyPage: PageResponse<JobPost> = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
};

const emptySummary: JobManagementSummary = { active: 0, completed: 0, draft: 0 };

interface LocationState {
  notice?: string;
}

export default function MyJobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const requestedTab = searchParams.get("tab") as JobListTab | null;
  const activeTab = tabs.some((tab) => tab.value === requestedTab) ? requestedTab! : "ACTIVE";
  const pageNumber = Math.max(Number(searchParams.get("page") || 0) || 0, 0);
  const [page, setPage] = useState<PageResponse<JobPost>>(emptyPage);
  const [summary, setSummary] = useState<JobManagementSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    locationState?.notice ? { type: "success", text: locationState.notice } : null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [posts, counts] = await Promise.all([
        jobService.getMine(activeTab, pageNumber, 8),
        jobService.getSummary(),
      ]);
      setPage(posts);
      setSummary(counts);
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, "Không thể tải danh sách bài đăng.") });
    } finally {
      setLoading(false);
    }
  }, [activeTab, pageNumber]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (locationState?.notice) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [location.pathname, location.search, locationState?.notice, navigate]);

  function changeTab(tab: JobListTab) {
    setMessage(null);
    setSearchParams({ tab });
  }

  async function runAction(job: JobPost, action: "publish" | "cancel" | "delete" | "repost") {
    const confirmations: Record<typeof action, string> = {
      publish: "Đăng bài này ngay?",
      cancel: "Kết thúc bài đăng này? Người nhận việc sẽ không còn thấy bài trong feed.",
      delete: "Xóa vĩnh viễn bài đăng này?",
      repost: "Tạo một bản nháp mới từ bài đăng này?",
    };
    if (!window.confirm(confirmations[action])) return;

    setBusyId(job.id);
    setMessage(null);
    try {
      if (action === "publish") await jobService.publish(job.id);
      if (action === "cancel") await jobService.cancel(job.id);
      if (action === "delete") await jobService.delete(job.id);
      if (action === "repost") await jobService.repost(job.id);
      setMessage({
        type: "success",
        text: {
          publish: "Đăng bài thành công.",
          cancel: "Đã kết thúc bài đăng.",
          delete: "Đã xóa bài đăng.",
          repost: "Đã tạo bản nháp mới.",
        }[action],
      });
      await load();
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, "Không thể thực hiện thao tác.") });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="hf-page hf-page-my-jobs space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6f8e95] sm:text-xs">Chế độ thuê việc</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Quản lý bài đăng</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Theo dõi công việc đang tuyển, bản nháp và các bài đã kết thúc.</p>
        </div>
        <Link to="/jobs/new" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#007f95] px-5 py-3 text-sm font-extrabold text-white shadow-[0_10px_25px_rgba(0,127,149,0.2)] sm:w-auto">
          <AppIcon name="plus" className="h-5 w-5" /> Đăng việc mới
        </Link>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <div className="grid min-w-[390px] grid-cols-3 gap-1.5">
          {tabs.map((tab) => {
            const selected = activeTab === tab.value;
            return (
              <button key={tab.value} type="button" onClick={() => changeTab(tab.value)} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-extrabold transition ${selected ? "bg-[#007f95] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
                {tab.label} <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${selected ? "bg-white/20" : "bg-slate-100"}`}>{summary[tab.countKey]}</span>
              </button>
            );
          })}
        </div>
      </section>

      {message && <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{message.text}</div>}

      {loading ? (
        <div className="grid min-h-[40dvh] place-items-center rounded-3xl border border-slate-200 bg-white text-sm font-bold text-slate-500">Đang tải bài đăng...</div>
      ) : page.content.length === 0 ? (
        <section className="grid min-h-[42dvh] place-items-center rounded-3xl border border-dashed border-[#a9d2d9] bg-white p-6 text-center"><EmptyArtwork />
          <div>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#e7f5f7] text-[#007f95]"><AppIcon name="briefcase" className="h-8 w-8" /></div>
            <h2 className="mt-4 text-xl font-extrabold">Chưa có bài đăng trong mục này</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Tạo công việc đầu tiên để bắt đầu tìm người hỗ trợ phù hợp trong khu vực.</p>
            <Link to="/jobs/new" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#007f95] px-5 py-2.5 text-sm font-extrabold text-white"><AppIcon name="plus" className="h-4 w-4" /> Tạo công việc</Link>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {page.content.map((job) => {
            const busy = busyId === job.id;
            return (
              <article key={job.id} className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
                <div className="grid min-[560px]:grid-cols-[170px_minmax(0,1fr)]">
                  <div className="relative min-h-40 bg-gradient-to-br from-[#c8e9ee] via-[#e7f5f7] to-[#f5fbfc]">
                    {job.media[0] ? <img src={job.media[0].url} alt="" className="h-full min-h-40 w-full object-cover" /> : <div className="grid h-full min-h-40 place-items-center text-5xl" aria-hidden="true">{job.category.code === "PET_CARE" ? "🐾" : job.category.code === "DELIVERY" ? "🛵" : "✨"}</div>}
                    <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-extrabold shadow-sm ${job.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : job.status === "DRAFT" ? "bg-slate-100 text-slate-600" : job.status === "CANCELLED" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{statusLabel(job.status)}</span>
                  </div>

                  <div className="min-w-0 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#6f8e95]">{job.category.name}</p>
                        <h2 className="mt-1 break-words text-lg font-extrabold leading-6">{job.title}</h2>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-base font-extrabold text-[#007f95]">{formatVnd(job.budgetAmount)}</p>
                        <p className="text-[10px] font-bold text-slate-400">{budgetLabel(job.budgetType)}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-xs font-bold text-slate-500">
                      <p className="flex items-start gap-2"><AppIcon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-[#007f95]" /><span>{formatJobDate(job.scheduledDate, job.startTime)}</span></p>
                      <p className="flex items-start gap-2"><AppIcon name="location" className="mt-0.5 h-4 w-4 shrink-0 text-[#007f95]" /><span className="line-clamp-2">{job.location}</span></p>
                      <p className="flex items-start gap-2"><AppIcon name="users" className="mt-0.5 h-4 w-4 shrink-0 text-[#007f95]" /><span>Cần {job.requiredWorkers} người · {job.matchedCount}/{job.requiredWorkers} đã Matching · {job.applicantCount} đang chờ</span></p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {(job.status === "DRAFT" || job.status === "PUBLISHED") && <Link to={`/jobs/${job.id}/edit`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-600 hover:border-[#9bcbd2]"><AppIcon name="edit" className="h-4 w-4" /> Chỉnh sửa</Link>}
                      {job.status === "DRAFT" && <button type="button" disabled={busy} onClick={() => void runAction(job, "publish")} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#007f95] px-3 py-2 text-xs font-extrabold text-white disabled:opacity-60"><AppIcon name="send" className="h-4 w-4" /> Đăng bài</button>}
                      {job.status === "PUBLISHED" && <Link to={`/posts/${job.id}/candidates`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#007f95] px-3 py-2 text-xs font-extrabold text-white"><AppIcon name="users" className="h-4 w-4" /> Xem ứng viên {job.applicantCount > 0 ? `(${job.applicantCount})` : ""}</Link>}
                      {job.status === "PUBLISHED" && job.matchedCount === 0 && <button type="button" disabled={busy} onClick={() => void runAction(job, "cancel")} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-700 disabled:opacity-60"><AppIcon name="close" className="h-4 w-4" /> Kết thúc</button>}
                      {job.status === "PUBLISHED" && job.matchedCount > 0 && <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-extrabold text-slate-400"><AppIcon name="info" className="h-4 w-4" /> Đã kết nối · không hủy trực tiếp</span>}
                      {(job.status === "COMPLETED" || job.status === "CANCELLED") && <button type="button" disabled={busy} onClick={() => void runAction(job, "repost")} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#007f95] px-3 py-2 text-xs font-extrabold text-white disabled:opacity-60"><AppIcon name="refresh" className="h-4 w-4" /> Đăng lại</button>}
                      {(job.status === "DRAFT" || job.status === "CANCELLED") && <button type="button" disabled={busy} onClick={() => void runAction(job, "delete")} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-extrabold text-red-600 disabled:opacity-60"><AppIcon name="trash" className="h-4 w-4" /> Xóa</button>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {page.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" disabled={page.first} onClick={() => setSearchParams({ tab: activeTab, page: String(page.page - 1) })} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">Trang trước</button>
          <span className="text-sm font-bold text-slate-500">{page.page + 1}/{page.totalPages}</span>
          <button type="button" disabled={page.last} onClick={() => setSearchParams({ tab: activeTab, page: String(page.page + 1) })} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">Trang sau</button>
        </div>
      )}
    </div>
  );
}
