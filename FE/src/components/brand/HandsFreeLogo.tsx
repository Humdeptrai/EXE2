import "./handsfree-logo.css";
interface HandsFreeLogoProps {
  className?: string;
  compact?: boolean;
}
export function HandsFreeLogo({ className = "", compact = false }: HandsFreeLogoProps) {
  return <div className={`hf-brand-logo ${compact ? "hf-brand-logo-compact" : ""} ${className}`} role="img" aria-label="HandsFree">
    <img className="hf-brand-mark" src="/brand/handsfree-mark.png" width="46" height="52" alt="" aria-hidden="true" />
    <span className="hf-brand-wordmark"><img src="/brand/handsfree-wordmark.png" width="140" height="34" alt="" aria-hidden="true" /></span>
  </div>;
}
