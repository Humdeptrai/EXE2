import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import type { JobDiscovery } from "../../../types/job";
import { budgetLabel, formatJobDate, formatVnd } from "../../jobs/utils/jobFormat";
import JobVisual from "./JobVisual";

interface DiscoveryCardProps {
  job: JobDiscovery;
  dragX?: number;
  dragging?: boolean;
  exiting?: "left" | "right" | null;
  onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel?: (event: ReactPointerEvent<HTMLElement>) => void;
}

export default function DiscoveryCard({
  job,
  dragX = 0,
  dragging = false,
  exiting = null,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: DiscoveryCardProps) {
  const [selectedImage, setSelectedImage] = useState({ jobId: job.id, index: 0 });
  const imageIndex = selectedImage.jobId === job.id && selectedImage.index < job.media.length ? selectedImage.index : 0;
  function changeImage(direction: number) {
    setSelectedImage({ jobId: job.id, index: (imageIndex + direction + job.media.length) % job.media.length });
  }
  const exitX = exiting === "left" ? -760 : exiting === "right" ? 760 : dragX;
  const rotation = exiting ? (exiting === "left" ? -18 : 18) : dragX / 28;
  const likeOpacity = Math.min(Math.max(dragX / 110, 0), 1);
  const skipOpacity = Math.min(Math.max(-dragX / 110, 0), 1);

  return (
    <article
      className={`hf-swipe-card hf-discovery-gallery relative isolate overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_24px_70px_rgba(22,66,78,0.2)] select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{
        transform: `translateX(${exitX}px) rotate(${rotation}deg)`,
        transition: dragging ? "none" : "transform 220ms cubic-bezier(.2,.8,.2,1)",
        touchAction: "pan-y",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="hf-discovery-photo relative flex items-center justify-center overflow-hidden bg-slate-100">
        <JobVisual job={job} imageIndex={imageIndex} fit="original" />
        {job.media.length > 1 && (
          <div onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => changeImage(-1)} aria-label="Ảnh trước" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-slate-950/60 text-white"><AppIcon name="chevron-left" className="h-5 w-5" /></button>
            <button type="button" onClick={() => changeImage(1)} aria-label="Ảnh tiếp theo" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-slate-950/60 text-white"><AppIcon name="chevron-right" className="h-5 w-5" /></button>
            <span aria-live="polite" className="absolute bottom-3 right-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-bold text-white">{imageIndex + 1}/{job.media.length}</span>
          </div>
        )}
        <div className="absolute left-5 top-5 rotate-[-10deg] rounded-xl border-4 border-rose-500 px-4 py-2 text-xl font-black uppercase tracking-[0.18em] text-rose-500" style={{ opacity: skipOpacity }}>
          Bỏ qua
        </div>
        <div className="absolute right-5 top-5 rotate-[10deg] rounded-xl border-4 border-emerald-400 px-4 py-2 text-xl font-black uppercase tracking-[0.18em] text-emerald-300" style={{ opacity: likeOpacity }}>
          Quan tâm
        </div>

      </div>
      <div className="p-4 text-slate-900 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#e8f6f8] text-[#007f95] px-3 py-1 text-[11px] font-extrabold backdrop-blur">{job.category.name}</span>
            <span className="rounded-full bg-[#007f95] px-3 py-1 text-[11px] font-extrabold text-white">{formatVnd(job.budgetAmount)} · {budgetLabel(job.budgetType)}</span>
          </div>
          <h2 className="text-2xl font-black leading-tight sm:text-3xl">{job.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 sm:text-base">{job.description}</p>
          <div className="mt-4 grid gap-2 text-xs font-bold text-slate-600 min-[420px]:grid-cols-2 sm:text-sm">
            <span className="flex min-w-0 items-center gap-2"><AppIcon name="location" className="h-4 w-4 shrink-0" /><span className="truncate">{job.location}</span></span>
            <span className="flex items-center gap-2"><AppIcon name="calendar" className="h-4 w-4 shrink-0" />{formatJobDate(job.scheduledDate, job.startTime)}</span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <div className="flex min-w-0 items-center gap-3">
              {job.owner.avatarUrl ? (
                <img src={job.owner.avatarUrl} alt={job.owner.fullName} className="h-10 w-10 shrink-0 rounded-full border-2 border-slate-200 object-cover" />
              ) : (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#b7dce2] bg-[#e8f6f8] text-[#007f95] text-sm font-black">{job.owner.fullName.charAt(0).toUpperCase()}</div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{job.owner.fullName}</p>
                <p className="truncate text-[11px] text-slate-500">Cần {job.requiredWorkers} người hỗ trợ</p>
              </div>
            </div>
            <Link
              to={`/jobs/${job.id}`}
              onPointerDown={(event) => event.stopPropagation()}
              className="shrink-0 rounded-full border border-[#b7dce2] bg-[#e8f6f8] text-[#007f95] px-3 py-2 text-xs font-extrabold backdrop-blur hover:bg-[#d5edf1]"
            >
              Chi tiết
            </Link>
          </div>
      </div>
    </article>
  );
}
