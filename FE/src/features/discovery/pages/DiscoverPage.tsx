import { EmptyArtwork } from "../../../components/ui/EmptyArtwork";
import { type FormEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useAuth } from "../../../context/AuthContext";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import { jobService } from "../../../services/jobService";
import type { DiscoveryFilters, JobCategory, JobDiscovery } from "../../../types/job";
import DiscoveryCard from "../components/DiscoveryCard";

const emptyFilterForm = {
  keyword: "",
  categoryId: "",
  location: "",
  minBudget: "",
  maxBudget: "",
};

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function DiscoverPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [filterForm, setFilterForm] = useState(emptyFilterForm);
  const [appliedFilters, setAppliedFilters] = useState<DiscoveryFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [jobs, setJobs] = useState<JobDiscovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const pointerRef = useRef<{ id: number; startX: number } | null>(null);
  const currentJob = jobs[0];

  const hasFilters = useMemo(() => Object.values(appliedFilters).some((value) => value !== undefined && value !== ""), [appliedFilters]);

  const loadFeed = useCallback(async (filters: DiscoveryFilters, replace = true) => {
    setError("");
    if (replace) setLoading(true);
    try {
      const result = await jobService.getFeed(filters, 0, 12);
      setJobs((current) => {
        if (replace) return result.content;
        const currentIds = new Set(current.map((item) => item.id));
        return [...current, ...result.content.filter((item) => !currentIds.has(item.id))];
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể tải feed công việc lúc này."));
    } finally {
      if (replace) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([
        jobService.getCategories().then(setCategories).catch(() => setCategories([])),
        loadFeed({}, true),
      ]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFeed]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const replenish = useCallback(async () => {
    try {
      const result = await jobService.getFeed(appliedFilters, 0, 12);
      setJobs((current) => {
        const currentIds = new Set(current.map((item) => item.id));
        return [...current, ...result.content.filter((item) => !currentIds.has(item.id))];
      });
    } catch {
      // The current deck remains usable; manual refresh can retry later.
    }
  }, [appliedFilters]);

  const removeCurrent = useCallback((jobId: string) => {
    setJobs((current) => current.filter((item) => item.id !== jobId));
    setDragX(0);
    setExiting(null);
    setBusy(false);
    void replenish();
  }, [replenish]);

  const performSwipe = useCallback(async (direction: "left" | "right") => {
    if (!currentJob || busy) return;
    const jobId = currentJob.id;
    setBusy(true);
    setDragging(false);
    setExiting(direction);
    setError("");
    try {
      if (direction === "left") {
        await jobService.skipJob(jobId);
        setNotice("Đã bỏ qua. Bạn có thể khôi phục trong lịch sử.");
      } else {
        await jobService.expressInterest(jobId, "INTERESTED");
        setNotice("Đã gửi sự quan tâm đến chủ bài.");
      }
      await delay(180);
      removeCurrent(jobId);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể cập nhật lựa chọn lúc này."));
      setExiting(null);
      setDragX(0);
      setBusy(false);
    }
  }, [busy, currentJob, removeCurrent]);

  const markVeryInterested = useCallback(async () => {
    if (!currentJob || busy) return;
    const jobId = currentJob.id;
    setBusy(true);
    setExiting("right");
    setError("");
    try {
      await jobService.expressInterest(jobId, "VERY_INTERESTED");
      setNotice("Đã đánh dấu rất quan tâm. Hồ sơ của bạn sẽ được ưu tiên hiển thị.");
      await delay(180);
      removeCurrent(jobId);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể đánh dấu rất quan tâm lúc này."));
      setExiting(null);
      setBusy(false);
    }
  }, [busy, currentJob, removeCurrent]);

  const toggleSave = useCallback(async () => {
    if (!currentJob || busy) return;
    setBusy(true);
    setError("");
    try {
      const state = currentJob.interaction.saved
        ? await jobService.unsaveJob(currentJob.id)
        : await jobService.saveJob(currentJob.id);
      setJobs((current) => current.map((item, index) => index === 0
        ? { ...item, interaction: state }
        : item));
      setNotice(state.saved ? "Đã lưu công việc." : "Đã bỏ lưu công việc.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể cập nhật danh sách đã lưu."));
    } finally {
      setBusy(false);
    }
  }, [busy, currentJob]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || busy) return;
      if (event.key === "ArrowLeft") void performSwipe("left");
      if (event.key === "ArrowRight") void performSwipe("right");
    }
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [busy, performSwipe]);

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (busy) return;
    pointerRef.current = { id: event.pointerId, startX: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!pointerRef.current || pointerRef.current.id !== event.pointerId || busy) return;
    setDragX(Math.max(-190, Math.min(190, event.clientX - pointerRef.current.startX)));
  }

  function handlePointerCancel() {
    pointerRef.current = null;
    setDragging(false);
    setDragX(0);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (!pointerRef.current || pointerRef.current.id !== event.pointerId) return;
    pointerRef.current = null;
    setDragging(false);
    if (dragX <= -90) {
      void performSwipe("left");
    } else if (dragX >= 90) {
      void performSwipe("right");
    } else {
      setDragX(0);
    }
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const filters: DiscoveryFilters = {
      keyword: filterForm.keyword.trim() || undefined,
      categoryId: filterForm.categoryId || undefined,
      location: filterForm.location.trim() || undefined,
      minBudget: filterForm.minBudget ? Number(filterForm.minBudget) : undefined,
      maxBudget: filterForm.maxBudget ? Number(filterForm.maxBudget) : undefined,
    };
    setAppliedFilters(filters);
    setShowFilters(false);
    setDragX(0);
    setExiting(null);
    void loadFeed(filters, true);
  }

  function clearFilters() {
    setFilterForm(emptyFilterForm);
    setAppliedFilters({});
    setShowFilters(false);
    void loadFeed({}, true);
  }

  return (
    <div className="hf-page hf-page-discover mx-auto max-w-5xl space-y-4 sm:space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#779198] sm:text-xs">Chế độ nhận việc</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Khám phá công việc</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">Vuốt để chọn. Chạm để xem chi tiết.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/skipped" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-600 hover:border-[#9acbd2]">
            <AppIcon name="undo" className="h-4 w-4" /> Đã bỏ qua
          </Link>
          <button type="button" onClick={() => setShowFilters((value) => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#007f95] px-4 py-2 text-xs font-extrabold text-white shadow-sm">
            <AppIcon name="filter" className="h-4 w-4" /> Bộ lọc{hasFilters ? " · Đang bật" : ""}
          </button>
        </div>
      </section>

      <form onSubmit={applyFilters} className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <AppIcon name="search" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={filterForm.keyword}
              onChange={(event) => setFilterForm((current) => ({ ...current, keyword: event.target.value }))}
              aria-label="Tìm công việc"
              placeholder="Công việc hoặc khu vực"
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-[#f8faff] py-3 pl-10 pr-3 text-base outline-none transition focus:border-[#58aeba] focus:ring-4 focus:ring-[#dff2f5] sm:text-sm"
            />
          </label>
          <button type="submit" className="min-h-12 shrink-0 rounded-2xl bg-[#0b1c30] px-4 text-sm font-extrabold text-white">Tìm</button>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-extrabold text-slate-600">Danh mục
              <select value={filterForm.categoryId} onChange={(event) => setFilterForm((current) => ({ ...current, categoryId: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-medium outline-none focus:border-[#58aeba] sm:text-sm">
                <option value="">Tất cả danh mục</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-extrabold text-slate-600">Khu vực
              <input value={filterForm.location} onChange={(event) => setFilterForm((current) => ({ ...current, location: event.target.value }))} placeholder="Ví dụ: Thủ Đức" className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-base font-medium outline-none focus:border-[#58aeba] sm:text-sm" />
            </label>
            <label className="text-xs font-extrabold text-slate-600">Ngân sách từ
              <input type="number" min="0" value={filterForm.minBudget} onChange={(event) => setFilterForm((current) => ({ ...current, minBudget: event.target.value }))} placeholder="0" className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-base font-medium outline-none focus:border-[#58aeba] sm:text-sm" />
            </label>
            <label className="text-xs font-extrabold text-slate-600">Đến
              <input type="number" min="0" value={filterForm.maxBudget} onChange={(event) => setFilterForm((current) => ({ ...current, maxBudget: event.target.value }))} placeholder="Không giới hạn" className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-base font-medium outline-none focus:border-[#58aeba] sm:text-sm" />
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4 lg:justify-end">
              <button type="button" onClick={clearFilters} className="min-h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-slate-500 lg:flex-none">Xóa bộ lọc</button>
              <button type="submit" className="min-h-11 flex-1 rounded-xl bg-[#007f95] px-5 text-sm font-extrabold text-white lg:flex-none">Áp dụng</button>
            </div>
          </div>
        )}
      </form>

      {!user?.profileCompleted && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2"><AppIcon name="info" className="mt-0.5 h-4 w-4 shrink-0" /> Hồ sơ đầy đủ giúp chủ bài hiểu rõ hơn khi xem danh sách ứng viên.</span>
          <Link to="/profile" className="shrink-0 font-extrabold underline underline-offset-4">Hoàn thiện hồ sơ</Link>
        </div>
      )}

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      {notice && <div className="fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-[#0b1c30] px-4 py-3 text-center text-sm font-bold text-white shadow-xl">{notice}</div>}

      {loading ? (
        <div className="mx-auto aspect-[4/5] w-full max-w-md animate-pulse rounded-[2rem] bg-slate-200" />
      ) : currentJob ? (
        <section className="mx-auto w-full max-w-md pb-3">
          <div className="relative">
            {jobs[1] && <div className="absolute inset-x-5 inset-y-3 translate-y-4 rounded-[2rem] bg-[#dcebee] shadow-sm" aria-hidden="true" />}
            <DiscoveryCard
              job={currentJob}
              dragX={dragX}
              dragging={dragging}
              exiting={exiting}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            />
          </div>

          <div className="mt-5 flex items-center justify-center gap-3 min-[390px]:gap-4">
            <button type="button" disabled={busy} onClick={() => void performSwipe("left")} aria-label="Bỏ qua công việc" className="grid h-14 w-14 place-items-center rounded-full border border-rose-200 bg-white text-rose-500 shadow-md transition hover:-translate-y-1 disabled:opacity-50 min-[390px]:h-14 min-[390px]:w-14">
              <AppIcon name="close" className="h-6 w-6" />
            </button>
            <button type="button" disabled={busy} onClick={() => void toggleSave()} aria-label={currentJob.interaction.saved ? "Bỏ lưu công việc" : "Lưu công việc"} className={`grid h-11 w-11 place-items-center rounded-full border bg-white shadow-md transition hover:-translate-y-1 disabled:opacity-50 min-[390px]:h-12 min-[390px]:w-12 ${currentJob.interaction.saved ? "border-[#007f95] bg-[#e8f6f8] text-[#007f95]" : "border-slate-200 text-slate-500"}`}>
              <AppIcon name="bookmark" className={`h-5 w-5 ${currentJob.interaction.saved ? "fill-current" : ""}`} />
            </button>
            <button type="button" disabled={busy} onClick={() => void markVeryInterested()} aria-label="Rất quan tâm" className="grid h-14 w-14 place-items-center rounded-full border border-amber-200 bg-white text-amber-500 shadow-md transition hover:-translate-y-1 disabled:opacity-50 min-[390px]:h-14 min-[390px]:w-14">
              <AppIcon name="star" className="h-6 w-6" />
            </button>
            <button type="button" disabled={busy} onClick={() => void performSwipe("right")} aria-label="Quan tâm công việc" className="grid h-14 w-14 place-items-center rounded-full bg-[#007f95] text-white shadow-[0_12px_28px_rgba(0,127,149,0.3)] transition hover:-translate-y-1 disabled:opacity-50 min-[390px]:h-14 min-[390px]:w-14">
              <AppIcon name="heart" className="h-6 w-6" />
            </button>
          </div>
          <div className="hf-swipe-legend" aria-hidden="true"><span>Bỏ qua</span><span>Lưu</span><span>Ưu tiên</span><span>Quan tâm</span></div>
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-[#a8ccd2] bg-white p-8 text-center sm:p-12"><EmptyArtwork />
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#e9f6f8] text-[#007f95]"><AppIcon name="check" className="h-8 w-8" /></div>
          <h2 className="mt-5 text-xl font-black">Bạn đã xem hết công việc phù hợp</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Đổi bộ lọc hoặc xem lại việc đã bỏ qua.</p>
          <div className="mt-5 flex flex-col justify-center gap-2 min-[420px]:flex-row">
            <button type="button" onClick={() => void loadFeed(appliedFilters, true)} className="min-h-11 rounded-xl bg-[#007f95] px-5 text-sm font-extrabold text-white">Tải lại công việc</button>
            <Link to="/skipped" className="min-h-11 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-extrabold text-slate-600">Xem lịch sử bỏ qua</Link>
          </div>
        </section>
      )}
    </div>
  );
}
