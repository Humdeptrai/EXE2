export function EmptyArtwork({ variant = "jobs" }: { variant?: "jobs" | "notification" }) {
  return <div className={`hf-empty-art hf-empty-art-${variant}`} aria-hidden="true"><img src="/images/handsfree-neighborhood.webp" alt="" loading="lazy" decoding="async" width="240" height="135" /><span>{variant === "notification" ? "Mọi thứ đã được cập nhật" : "Một khởi đầu mới"}</span></div>;
}
