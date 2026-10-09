import { isIdentityActionHandled } from "../../../config/axios";
import { EmptyArtwork } from "../../../components/ui/EmptyArtwork";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import { jobService } from "../../../services/jobService";
import { matchingService } from "../../../services/matchingService";
import type { DiscoverySummary, JobDiscovery, PageResponse } from "../../../types/job";
import type { MatchPage } from "../../../types/matching";
import MatchCard from "../../matching/components/MatchCard";
import JobListCard from "../components/JobListCard";

type SavedTab = "SAVED" | "INTERESTED" | "VERY_INTERESTED" | "MATCHING";

const emptySummary: DiscoverySummary = { saved: 0, interested: 0, veryInterested: 0, skipped: 0, matching: 0 };
const emptyPage: PageResponse<JobDiscovery> = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true };
const emptyMatchPage: MatchPage = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true };

const tabs: Array<{ key: SavedTab; label: string; countKey: keyof DiscoverySummary }> = [
  { key: "SAVED", label: "Đã lưu", countKey: "saved" },
  { key: "INTERESTED", label: "Quan tâm", countKey: "interested" },
  { key: "VERY_INTERESTED", label: "Rất quan tâm", countKey: "veryInterested" },
  { key: "MATCHING", label: "Matching", countKey: "matching" },
];

export default function SavedJobsPage() {
  const [tab, setTab] = useState<SavedTab>("SAVED");
  const [summary, setSummary] = useState<DiscoverySummary>(emptySummary);
  const [result, setResult] = useState<PageResponse<JobDiscovery>>(emptyPage);
  const [matchResult, setMatchResult] = useState<MatchPage>(emptyMatchPage);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await jobService.getDiscoverySummary());
    } catch {
      setSummary(emptySummary);
    }
  }, []);

  const loadList = useCallback(async (selectedTab: SavedTab, selectedPage: number) => {
    setLoading(true);
    setError("");
    try {
      if (selectedTab === "MATCHING") {
        setMatchResult(await matchingService.getProviderMatches(selectedPage, 8));
        setResult(emptyPage);
      } else {
        const next = selectedTab === "SAVED"
          ? await jobService.getSaved(selectedPage, 8)
          : await jobService.getInterested(selectedTab === "INTERESTED" ? "INTERESTED" : "VERY_INTERESTED", selectedPage, 8);
        setResult(next);
        setMatchResult(emptyMatchPage);
      }
    } catch (requestError) {
      if (!isIdentityActionHandled(requestError)) setError(getApiErrorMessage(requestError, "Không thể tải danh sách lúc này."));
      setResult(emptyPage);
      setMatchResult(emptyMatchPage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSummary(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSummary]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadList(tab, page); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadList, page, tab]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function selectTab(nextTab: SavedTab) {
    setTab(nextTab);
    setPage(0);
  }

  async function handleUnsave(job: JobDiscovery) {
    setBusyId(job.id);
    setError("");
    try {
      await jobService.unsaveJob(job.id);
      setNotice("Đã bỏ lưu công việc.");
      await Promise.all([loadList(tab, page), loadSummary()]);
    } catch (requestError) {
      if (!isIdentityActionHandled(requestError)) setError(getApiErrorMessage(requestError, "Không thể bỏ lưu công việc."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleWithdraw(job: JobDiscovery) {
    setBusyId(job.id);
    setError("");
    try {
      await jobService.withdrawInterest(job.id);
      setNotice("Đã rút sự quan tâm.");
      await Promise.all([loadList(tab, page), loadSummary()]);
    } catch (requestError) {
      if (!isIdentityActionHandled(requestError)) setError(getApiErrorMessage(requestError, "Không thể rút sự quan tâm."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpgrade(job: JobDiscovery) {
    setBusyId(job.id);
    setError("");
    try {
      await jobService.expressInterest(job.id, "VERY_INTERESTED");
      setNotice("Đã chuyển sang Rất quan tâm.");
      await Promise.all([loadList(tab, page), loadSummary()]);
    } catch (requestError) {
      if (!isIdentityActionHandled(requestError)) setError(getApiErrorMessage(requestError, "Không thể cập nhật mức độ quan tâm."));
    } finally {
      setBusyId(null);
    }
  }

  const activeResult = tab === "MATCHING" ? matchResult : result;

  return (
    <div className="hf-page hf-page-saved-jobs space-y-4 sm:space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#779198] sm:text-xs">Danh sách cá nhân</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Công việc của bạn</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">Theo dõi công việc đã lưu, các yêu cầu đang chờ và những Matching đã được chủ bài chấp nhận.</p>
        </div>
        <Link to="/skipped" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600 hover:border-[#9acbd2]">
          <AppIcon name="undo" className="h-4 w-4" /> Đã bỏ qua ({summary.skipped})
        </Link>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <div className="flex min-w-max gap-1">
          {tabs.map((item) => (
            <button key={item.key} type="button" onClick={() => selectTab(item.key)} className={`min-h-11 rounded-xl px-3 text-xs font-extrabold transition sm:px-4 sm:text-sm ${tab === item.key ? "bg-[#007f95] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
              {item.label} ({summary[item.countKey]})
            </button>
          ))}
        </div>
      </div>

      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      {loading ? (
        <div className="grid gap-4"><div className="h-52 animate-pulse rounded-3xl bg-slate-200" /><div className="h-52 animate-pulse rounded-3xl bg-slate-200" /></div>
      ) : tab === "MATCHING" ? (
        matchResult.content.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-[#a8ccd2] bg-white p-8 text-center sm:p-12"><EmptyArtwork />
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#e9f6f8] text-[#007f95]"><AppIcon name="users" className="h-8 w-8" /></div>
            <h2 className="mt-5 text-xl font-black">Chưa có Matching</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Các kết nối được chấp nhận sẽ xuất hiện ở đây. Chat mở khi hai bên hoàn tất phí kết nối.</p>
          </section>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">{matchResult.content.map((match) => <MatchCard key={match.id} match={match} perspective="PROVIDER" />)}</div>
        )
      ) : result.content.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12"><EmptyArtwork />
          <AppIcon name={tab === "SAVED" ? "bookmark" : "heart"} className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-black">Chưa có công việc trong mục này</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Khám phá feed và sử dụng các nút lưu, quan tâm hoặc rất quan tâm.</p>
          <Link to="/discover" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#007f95] px-5 text-sm font-extrabold text-white">Khám phá ngay</Link>
        </section>
      ) : (
        <div className="space-y-4">
          {result.content.map((job) => (
            <JobListCard
              key={job.id}
              job={job}
              badge={tab === "SAVED" ? "Đã lưu" : tab === "VERY_INTERESTED" ? "Rất quan tâm" : "Đang quan tâm"}
              actions={
                <>
                  {tab === "SAVED" && <button type="button" disabled={busyId === job.id} onClick={() => void handleUnsave(job)} className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-extrabold text-slate-600 disabled:opacity-50">Bỏ lưu</button>}
                  {tab === "INTERESTED" && <button type="button" disabled={busyId === job.id} onClick={() => void handleUpgrade(job)} className="min-h-10 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-extrabold text-amber-700 disabled:opacity-50">Rất quan tâm</button>}
                  {tab !== "SAVED" && <button type="button" disabled={busyId === job.id} onClick={() => void handleWithdraw(job)} className="min-h-10 rounded-xl border border-rose-200 px-3 text-xs font-extrabold text-rose-600 disabled:opacity-50">Rút yêu cầu</button>}
                  <Link to={`/jobs/${job.id}`} className="inline-flex min-h-10 items-center rounded-xl bg-[#007f95] px-3 text-xs font-extrabold text-white">Chi tiết</Link>
                </>
              }
            />
          ))}
        </div>
      )}

      {activeResult.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button type="button" disabled={activeResult.first} onClick={() => setPage((value) => Math.max(value - 1, 0))} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 disabled:opacity-40"><AppIcon name="chevron-left" className="h-5 w-5" /></button>
          <span className="text-sm font-extrabold text-slate-500">Trang {activeResult.page + 1}/{activeResult.totalPages}</span>
          <button type="button" disabled={activeResult.last} onClick={() => setPage((value) => value + 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 disabled:opacity-40"><AppIcon name="chevron-right" className="h-5 w-5" /></button>
        </div>
      )}
    </div>
  );
}
