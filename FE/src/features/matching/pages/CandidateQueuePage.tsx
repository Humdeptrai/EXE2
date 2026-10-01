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
    setLoading(true);
    setError("");
    try {
      const [jobResult, candidateResult] = await Promise.all([
        jobService.getMineById(jobId),
        matchingService.getCandidates(jobId, 0, 50),
      ]);
      setJob(jobResult);
      setCandidates(candidateResult.content);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể tải danh sách ứng viên."));
    } finally {
      setLoading(false);
    }
  }, [jobId]);

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
      if (event.key === "ArrowLeft") void performDecision("reject");
      if (event.key === "ArrowRight" && !capacityFull) void performDecision("accept");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [capacityFull, performDecision]);

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
          <p className="mt-1 text-sm leading-6 text-slate-500">Quét trái để từ chối, quét phải để chấp nhận Matching. Hồ sơ Rất quan tâm được ưu tiên trước.</p>
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
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      {notice && <div className="fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-[#0b1c30] px-4 py-3 text-center text-sm font-bold text-white shadow-xl">{notice}</div>}

      {currentCandidate ? (
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
      )}
    </div>
  );
}
