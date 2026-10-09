import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { ratingService } from "../../../services/ratingService";
import type { MatchRatingState } from "../../../types/rating";
import { AppIcon } from "../../../components/ui/AppIcon";
import UserNotice from "../../../components/feedback/UserNotice";
import { getApiErrorMessage } from "../../auth/utils/apiError";

function RatingPrompt({ state, onDone }: { state: MatchRatingState; onDone: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => { dialog?.close(); document.body.style.overflow = overflow; if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); };
  }, []);
  async function finish(defer: boolean) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      if (defer) await ratingService.dismissReminder(state.matchId);
      else await ratingService.rateMatch(state.matchId, { stars, comment: comment.trim() });
      window.dispatchEvent(new Event("handsfree:rating-updated"));
      onDone();
    } catch (e) { setError(getApiErrorMessage(e, "Không thể cập nhật đánh giá. Vui lòng thử lại.")); }
    finally { lock.current = false; setBusy(false); }
  }
  return createPortal(<dialog ref={ref} className="hf-confirm-dialog" aria-labelledby={titleId} onCancel={e => { e.preventDefault(); void finish(true); }}>
    <div className="hf-confirm-icon"><AppIcon name="star" className="h-6 w-6" /></div>
    <h2 id={titleId}>Đánh giá trải nghiệm của bạn</h2>
    <p>{state.jobTitle} · {state.counterpart.fullName}</p>
    <p className="mt-3 text-xs text-slate-500">{state.counterpartMode === "PROVIDER" ? "Đánh giá uy tín nhận việc của đối phương" : "Đánh giá uy tín thuê việc của đối phương"}</p>
    <div className="my-5 flex justify-center gap-1 sm:gap-2" role="group" aria-label="Chọn số sao">
      {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" disabled={busy} aria-label={`${value} sao`} aria-pressed={stars === value} onClick={() => setStars(value)} className={`grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-xl border ${value <= stars ? "border-amber-300 bg-amber-50 text-amber-500" : "border-slate-200 text-slate-300"}`}><AppIcon name="star" className={`h-7 w-7 ${value <= stars ? "fill-current" : ""}`} /></button>)}
    </div>
    <label className="block text-sm font-bold">Ghi chú (không bắt buộc)<textarea disabled={busy} maxLength={500} value={comment} onChange={e => setComment(e.target.value)} rows={4} className="mt-2 min-h-28 w-full rounded-2xl border border-slate-300 p-3 text-base outline-none focus:border-[#007f95]" /></label>
    <p className="mt-1 text-right text-xs text-slate-400">{comment.length}/500</p>
    <p className="mt-3 text-xs text-slate-500">Hạn đánh giá: {state.ratingClosesAt ? new Date(state.ratingClosesAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—"}. Chọn để sau và quay lại từ bài đăng, ứng viên hoặc matching.</p>
    {error && <UserNotice message={error} error className="mt-3" />}
    <div className="hf-confirm-actions"><button type="button" autoFocus disabled={busy} onClick={() => void finish(true)}>Để sau</button><button type="button" disabled={busy} className="hf-confirm-primary" onClick={() => void finish(false)}>{busy ? "Đang lưu…" : "Gửi đánh giá"}</button></div>
  </dialog>, document.body);
}

export default function RatingReminder() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [prompt, setPrompt] = useState<MatchRatingState | null>(null);
  const open = useRef(false);
  useEffect(() => {
    if (!user || user.role !== "USER" || pathname.endsWith("/rating") || pathname.includes("face-comparison")) return;
    let active = true;
    let loading = false;
    async function check() {
      if (loading || open.current || document.visibilityState !== "visible" || document.querySelector("dialog[open]")) return;
      loading = true;
      try {
        const items = await ratingService.pendingRatings();
        if (active && !open.current && !document.querySelector("dialog[open]") && items[0]) {
          open.current = true; setPrompt(items[0]);
        }
      } catch { /* A background reminder must not block normal use; retry on the next check. */ }
      finally { loading = false; }
    }
    void check();
    const interval = window.setInterval(() => void check(), 60000);
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [user, pathname]);
  return prompt && <RatingPrompt key={prompt.matchId} state={prompt} onDone={() => { open.current = false; setPrompt(null); }} />;
}
