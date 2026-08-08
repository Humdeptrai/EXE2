type IconName = "user" | "at" | "lock" | "lock-clock" | "eye" | "eye-off" | "arrow";

interface FormIconProps {
  name: IconName;
  className?: string;
}

export function FormIcon({ name, className = "" }: FormIconProps) {
  const common = { width: 27, height: 27, viewBox: "0 0 24 24", fill: "none", className, "aria-hidden": true } as const;
  if (name === "user") return <svg {...common}><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2"/><path d="M5.5 19c.7-4 3-6 6.5-6s5.8 2 6.5 6H5.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>;
  if (name === "at") return <svg {...common}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/><path d="M15.5 15.5c-2.4 1.4-5.5.1-5.5-2.7 0-2.1 1.4-3.8 3.3-3.8 1.7 0 2.7 1.2 2.7 2.8v2.3c0 1.4 2.1 1.1 2.7-.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
  if (name === "lock" || name === "lock-clock") return <svg {...common}><rect x="6" y="10" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M9 10V7a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="2"/><circle cx={name === "lock-clock" ? "16.8" : "12"} cy={name === "lock-clock" ? "18" : "15"} r={name === "lock-clock" ? "3.2" : "1"} fill={name === "lock-clock" ? "#f7f8ff" : "currentColor"} stroke={name === "lock-clock" ? "currentColor" : "none"} strokeWidth="1.7"/><path d={name === "lock-clock" ? "M16.8 16.4V18l1.1.7" : ""} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
  if (name === "eye" || name === "eye-off") return <svg {...common}><path d="M2.7 12s3.3-5 9.3-5 9.3 5 9.3 5-3.3 5-9.3 5-9.3-5-9.3-5Z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="2"/>{name === "eye-off" && <path d="m4 4 16 16" stroke="currentColor" strokeWidth="2"/>}</svg>;
  return <svg {...common}><path d="M5 12h13M13 7l5 5-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
