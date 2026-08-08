import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppIcon } from "../../../components/ui/AppIcon";
import type { JobDiscovery } from "../../../types/job";
import { budgetLabel, formatJobDate, formatVnd } from "../../jobs/utils/jobFormat";
import JobVisual from "./JobVisual";

interface JobListCardProps {
  job: JobDiscovery;
  badge?: string;
  actions?: ReactNode;
}

export default function JobListCard({ job, badge, actions }: JobListCardProps) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-[#a9d2d8] hover:shadow-md">
      <div className="grid min-w-0 gap-0 sm:grid-cols-[180px_1fr]">
        <Link to={`/jobs/${job.id}`} className="relative block aspect-[16/9] overflow-hidden bg-slate-100 sm:aspect-auto sm:min-h-48">
          <JobVisual job={job} />
          {badge && <span className="absolute left-3 top-3 rounded-full bg-[#007f95] px-3 py-1 text-[10px] font-extrabold text-white shadow">{badge}</span>}
        </Link>
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6e8c93]">{job.category.name}</p>
              <Link to={`/jobs/${job.id}`} className="mt-1 block break-words text-lg font-black text-[#0b1c30] hover:text-[#007f95]">{job.title}</Link>
            </div>
            <p className="shrink-0 text-lg font-black text-[#007f95]">{formatVnd(job.budgetAmount)}</p>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{job.description}</p>
          <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 min-[430px]:grid-cols-2">
            <span className="flex min-w-0 items-center gap-2"><AppIcon name="location" className="h-4 w-4 shrink-0 text-[#008ea3]" /><span className="truncate">{job.location}</span></span>
            <span className="flex items-center gap-2"><AppIcon name="calendar" className="h-4 w-4 shrink-0 text-[#008ea3]" />{formatJobDate(job.scheduledDate, job.startTime)}</span>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              {job.owner.avatarUrl ? <img src={job.owner.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e5f4f6] text-xs font-black text-[#007f95]">{job.owner.fullName.charAt(0).toUpperCase()}</div>}
              <span className="truncate text-xs font-bold text-slate-600">{job.owner.fullName} · {budgetLabel(job.budgetType)}</span>
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        </div>
      </div>
    </article>
  );
}
