import { AppIcon } from "../../../components/ui/AppIcon";
import type { JobDiscovery } from "../../../types/job";

interface JobVisualProps {
  job: JobDiscovery;
  className?: string;
  imageIndex?: number;
}

export default function JobVisual({ job, className = "", imageIndex = 0 }: JobVisualProps) {
  const image = job.media[imageIndex]?.url || job.media[0]?.url;
  if (image) {
    return <img src={image} alt={job.title} className={`h-full w-full object-cover ${className}`} />;
  }

  return (
    <div className={`grid h-full w-full place-items-center bg-gradient-to-br from-[#dff4f7] via-[#eef8fa] to-[#dfe8fb] text-[#007f95] ${className}`}>
      <div className="text-center">
        <AppIcon name="briefcase" className="mx-auto h-12 w-12 opacity-70" />
        <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.14em] opacity-70">{job.category.name}</p>
      </div>
    </div>
  );
}
