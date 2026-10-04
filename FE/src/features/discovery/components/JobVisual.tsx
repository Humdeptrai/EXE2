import { AppIcon } from "../../../components/ui/AppIcon";
import type { JobDiscovery } from "../../../types/job";

interface JobVisualProps {
  job: JobDiscovery;
  className?: string;
  imageIndex?: number;
  fit?: "cover" | "original";
}

export default function JobVisual({ job, className = "", imageIndex = 0, fit = "cover" }: JobVisualProps) {
  const image = job.media[imageIndex]?.url || job.media[0]?.url;
  if (image) {
    return <img src={image} alt={job.title} decoding="async" className={`${fit === "original" ? "mx-auto block h-auto w-auto max-h-[70dvh] max-w-full object-contain" : "h-full w-full object-cover"} ${className}`} />;
  }

  return (
    <div className={`hf-job-placeholder relative h-full w-full overflow-hidden ${className}`}>
      <img src="/images/handsfree-community.webp" alt="" aria-hidden="true" className="h-full w-full object-cover" loading="lazy" decoding="async" />
      <span className="hf-job-placeholder-label"><AppIcon name="briefcase" className="h-4 w-4" />{job.category.name} · Minh họa</span>
    </div>
  );
}
