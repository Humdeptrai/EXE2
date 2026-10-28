import { useSyncExternalStore } from "react";
import { getTheme, subscribeTheme, toggleTheme } from "./theme";

export default function ThemeToggle({ className, label = false, slotLabel }: { className?: string; label?: boolean; slotLabel?: string }) {
  const dark = useSyncExternalStore(subscribeTheme, getTheme) === "dark";
  const title = dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";
  return <button type="button" className={className} onClick={toggleTheme} title={title} aria-label={title} aria-pressed={dark}>
    {slotLabel && <span className="hf-theme-slot-label" aria-hidden="true">{slotLabel}</span>}
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></> : <path d="M20.8 13a9 9 0 0 1-9.8-9.8A9 9 0 1 0 20.8 13Z" />}
    </svg>{label && <span>{dark ? "Giao diện tối" : "Giao diện sáng"}</span>}
  </button>;
}
