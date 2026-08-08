interface HandsFreeLogoProps {
  className?: string;
  compact?: boolean;
}

export function HandsFreeLogo({ className = "", compact = false }: HandsFreeLogoProps) {
  return (
    <div className={`flex min-w-0 items-center justify-center text-[#006b82] ${compact ? "gap-2" : "gap-3"} ${className}`} aria-label="Hands-free">
      <svg className={compact ? "h-6 w-6 shrink-0" : "h-7 w-7 shrink-0 sm:h-8 sm:w-8"} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M11.4 6.2 5.8 11.8a3.8 3.8 0 0 0 0 5.4l7.8 7.8a3.8 3.8 0 0 0 5.4 0l1.5-1.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="m20.6 25.8 5.6-5.6a3.8 3.8 0 0 0 0-5.4L18.4 7a3.8 3.8 0 0 0-5.4 0l-1.5 1.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="m10.2 13.1 8.7 8.7M13 10.3l8.7 8.7M7.9 15.5l8.7 8.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
      <span className={`truncate font-extrabold tracking-[-1.2px] ${compact ? "text-xl" : "text-[26px] sm:text-[30px]"}`}>Hands-free</span>
    </div>
  );
}
