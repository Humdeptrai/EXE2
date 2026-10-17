import RecommendationBadge from "../../../components/ui/RecommendationBadge";
import UserNotice from "../../../components/feedback/UserNotice";
import { EmptyArtwork } from "../../../components/ui/EmptyArtwork";
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import { jobService } from "../../../services/jobService";
import { matchingService } from "../../../services/matchingService";
import type { JobPost } from "../../../types/job";
import type { Candidate } from "../../../types/matching";
import { getApiErrorMessage } from "../../auth/utils/apiError";
import CandidateSwipeCard from "../components/CandidateSwipeCard";

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function CandidateQueuePage() {
  const { jobId = "" } = useParams();
  const [view, setView] = useState<"list" | "swipe">("list");
  const loadVersion = useRef(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [job, setJob] = useState<JobPost | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const pointerRef = useRef<{ id: number; startX: number } | null>(null);
  const currentCandidate = candidates[0];
  const capacityFull = Boolean(job && job.matchedCount >= job.requiredWorkers);

  const load = useCallback(async () => {
    if (!jobId) return;
    const version = ++loadVersion.current;
    setLoading(true);
    setError("");
    try {
      const [jobResult, candidateResult] = await Promise.all([
        jobService.getMineById(jobId),
        matchingService.getCandidates(jobId, page, 20),
      ]);
      if (version !== loadVersion.current) return;
      if (page > 0 && page >= candidateResult.totalPages) { setPage(Math.max(0, candidateResult.totalPages - 1)); return; }
      setJob(jobResult);
      setCandidates(candidateResult.content);
      setTotalPages(candidateResult.totalPages);
      setTotalCandidates(candidateResult.totalElements);
    } catch (requestError) {
      if (version === loadVersion.current) setError(getApiErrorMessage(requestError, "Không thể tải danh sách ứng viên."));
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [jobId, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const removeCurrent = useCallback((interestId: string) => {
    setCandidates((items) => items.filter((item) => item.interestId !== interestId));
    setTotalCandidates(count => Math.max(0, count - 1));
    setDragX(0);
    setExiting(null);
    setBusy(false);
  }, []);

  const performDecision = useCallback(async (decision: "reject" | "accept") => {
    if (!currentCandidate || busy || !jobId) return;
    if (decision === "accept" && capacityFull) {
      setError("Bài đăng đã đủ người. Các ứng viên còn lại được giữ ở trạng thái chờ làm dự phòng.");
      setDragX(0);
      return;
    }

    const interestId = currentCandidate.interestId;
    setBusy(true);
    setDragging(false);
    setExiting(decision === "accept" ? "right" : "left");
    setError("");
    try {
      if (decision === "accept") {
        await matchingService.acceptCandidate(jobId, interestId);
        setNotice("Đã chấp nhận ứng viên và tạo Matching.");
        setJob((current) => current ? { ...current, matchedCount: current.matchedCount + 1, applicantCount: Math.max(current.applicantCount - 1, 0) } : current);
      } else {
        await matchingService.rejectCandidate(jobId, interestId);
        setNotice("Đã từ chối ứng viên.");
        setJob((current) => current ? { ...current, applicantCount: Math.max(current.applicantCount - 1, 0) } : current);
      }
      await delay(180);
      removeCurrent(interestId);
      void load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể phản hồi ứng viên lúc này."));
      setExiting(null);
      setDragX(0);
      setBusy(false);
      void load();
    }
  }, [busy, capacityFull, currentCandidate, jobId, load, removeCurrent]);

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (busy) return;
    pointerRef.current = { id: event.pointerId, startX: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!pointerRef.current || pointerRef.current.id !== event.pointerId || !dragging) return;
    setDragX(event.clientX - pointerRef.current.startX);
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
    if (dragX <= -110) void performDecision("reject");
    else if (dragX >= 110 && !capacityFull) void performDecision("accept");
    else setDragX(0);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (view !== "swipe" || (event.target instanceof HTMLElement && event.target.closest("input,textarea,select,button,a,summary"))) return;
      if (event.key === "ArrowLeft") void performDecision("reject");
      if (event.key === "ArrowRight" && !capacityFull) void performDecision("accept");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [capacityFull, performDecision, view]);

  if (loading) {
    return <div className="grid min-h-[55dvh] place-items-center rounded-3xl border border-slate-200 bg-white text-sm font-bold text-slate-500">Đang tải ứng viên...</div>;
  }

  return (
    <div className="hf-page hf-page-candidate-queue mx-auto max-w-5xl space-y-4 sm:space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link to="/candidates" className="inline-flex min-h-10 items-center gap-2 text-sm font-extrabold text-[#007f95]"><AppIcon name="arrow-left" className="h-4 w-4" /> Danh sách công việc</Link>
          <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#779198] sm:text-xs">Duyệt ứng viên</p>
          <h1 className="mt-1 break-words text-2xl font-black sm:text-3xl">{job?.title || "Ứng viên"}</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">Xem hồ sơ để lựa chọn hoặc chuyển sang quẹt ứng viên. Ứng viên có điểm đề xuất cao được ưu tiên trước. Điểm không thay thế việc trao đổi và lựa chọn của bạn.</p>
        </div>
        {job && (
          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
            <p className="text-2xl font-black text-[#007f95]">{job.matchedCount}/{job.requiredWorkers}</p>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Đã kết nối</p>
          </div>
        )}
      </section>

      {capacityFull && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800">
          Đã đủ {job?.requiredWorkers} người. Ứng viên PENDING còn lại được giữ làm dự phòng; bạn vẫn có thể từ chối nhưng không thể accept thêm cho đến khi có slot trống ở luồng ngắt kết nối sau này.
        </div>
      )}
      {error && <UserNotice message={error} error />}
      {notice && <div className="hf-user-toast"><UserNotice message={notice} onClose={() => setNotice("")} /></div>}

      <div role="group" aria-label="Cách xem ứng viên" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={`min-h-11 rounded-xl px-4 text-sm font-extrabold ${view === "list" ? "bg-[#007f95] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>Danh sách</button>
        <button type="button" aria-pressed={view === "swipe"} onClick={() => setView("swipe")} className={`min-h-11 rounded-xl px-4 text-sm font-extrabold ${view === "swipe" ? "bg-[#007f95] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>Quẹt ứng viên</button>
      </div>
      {view === "list" && <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black">Ứng viên theo điểm đề xuất</h2>
          <span className="text-xs font-bold text-slate-500">{totalCandidates} đang chờ · Cao đến thấp</span>
        </div>
        {candidates.length === 0 && <div className="rounded-2xl border border-dashed border-[#bfe0e5] bg-[#f5fbfc] p-5 text-center">
          <p className="text-sm font-bold text-slate-600">Chưa có ứng viên đang chờ. Ứng viên mới sẽ xuất hiện khi họ quan tâm bài đăng.</p>
          <button type="button" onClick={() => void load()} className="mt-3 min-h-11 rounded-xl bg-[#007f95] px-4 text-sm font-extrabold text-white">Tải lại</button>
        </div>}
        <div className="grid gap-3 sm:grid-cols-2">
          {candidates.map((candidate, index) => <article key={candidate.interestId} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 p-3 sm:p-4">
            <RecommendationBadge value={candidate.recommendation} role="working" />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="break-words text-sm font-extrabold">#{page * 20 + index + 1} · {candidate.displayName}</p><p className="mt-1 break-words text-xs text-slate-500">{candidate.location || "Chưa cập nhật khu vực"}</p></div>
              {candidate.interestLevel === "VERY_INTERESTED" && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Rất quan tâm</span>}
            </div>
            <p className="text-xs leading-5 text-slate-500">{candidate.hiringInsights.averageRating == null ? "Chưa có đánh giá" : `${candidate.hiringInsights.averageRating.toFixed(1)}/5 ★`} · {candidate.hiringInsights.ratingCount} đánh giá · {candidate.hiringInsights.successfulMatchCount} kết nối nhận việc</p>
            <Link to={`/posts/${jobId}/candidates/${candidate.interestId}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#bfe0e5] px-4 text-xs font-extrabold text-[#007f95]">Xem ứng viên</Link>
          </article>)}
        </div>
        {totalPages > 1 && <nav aria-label="Trang ứng viên" className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button type="button" disabled={page === 0 || busy} onClick={() => setPage(p => p - 1)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold disabled:opacity-40">Trước</button>
          <span className="text-xs text-slate-500">Trang {page + 1}/{totalPages}</span>
          <button type="button" disabled={page + 1 >= totalPages || busy} onClick={() => setPage(p => p + 1)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold disabled:opacity-40">Sau</button>
        </nav>}
      </section>}

      {view === "swipe" && totalPages > 1 && <nav aria-label="Trang quẹt ứng viên" className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" disabled={page === 0 || busy} onClick={() => setPage(p => p - 1)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold disabled:opacity-40">Trước</button>
        <span className="text-xs text-slate-500">Trang {page + 1}/{totalPages}</span>
        <button type="button" disabled={page + 1 >= totalPages || busy} onClick={() => setPage(p => p + 1)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold disabled:opacity-40">Sau</button>
      </nav>}
      {view === "swipe" && (currentCandidate ? (
        <section className="mx-auto w-full max-w-md pb-3">
          <div className="relative">
            {candidates[1] && <div className="absolute inset-x-5 inset-y-3 translate-y-4 rounded-[2rem] bg-[#dcebee] shadow-sm" aria-hidden="true" />}
            <CandidateSwipeCard
              candidate={currentCandidate}
              jobId={jobId}
              dragX={dragX}
              dragging={dragging}
              exiting={exiting}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            />
          </div>

          <div className="mt-5 flex items-center justify-center gap-5">
            <button type="button" disabled={busy} onClick={() => void performDecision("reject")} aria-label="Từ chối ứng viên" className="grid h-14 w-14 place-items-center rounded-full border border-rose-200 bg-white text-rose-500 shadow-md transition hover:-translate-y-1 disabled:opacity-50">
              <AppIcon name="close" className="h-6 w-6" />
            </button>
            <button type="button" disabled={busy || capacityFull} onClick={() => void performDecision("accept")} aria-label="Chấp nhận Matching" className="grid h-14 w-14 place-items-center rounded-full bg-[#007f95] text-white shadow-[0_12px_28px_rgba(0,127,149,0.3)] transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">
              <AppIcon name="check" className="h-6 w-6" />
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] font-bold text-slate-400">Desktop: ← từ chối · → chấp nhận</p>
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-[#a8ccd2] bg-white p-8 text-center sm:p-12"><EmptyArtwork />
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#e9f6f8] text-[#007f95]"><AppIcon name="users" className="h-8 w-8" /></div>
          <h2 className="mt-5 text-xl font-black">Đã xem hết ứng viên</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Ứng viên mới sẽ xuất hiện khi họ quan tâm bài đăng.</p>
          <div className="mt-5 flex flex-col justify-center gap-2 min-[420px]:flex-row">
            <button type="button" onClick={() => void load()} className="min-h-11 rounded-xl bg-[#007f95] px-5 text-sm font-extrabold text-white">Tải lại</button>
            <Link to="/candidates" className="min-h-11 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-extrabold text-slate-600">Xem Matching hiện tại</Link>
          </div>
        </section>
      ))}
    </div>
  );
}
