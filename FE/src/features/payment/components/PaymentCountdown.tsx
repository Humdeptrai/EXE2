import { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "../../../components/ui/AppIcon";
export default function PaymentCountdown({ deadline, serverTime, completed, inactive = false, onExpire }: { deadline?: string | null; serverTime?: string; completed: boolean; inactive?: boolean; onExpire?: () => void }) {
  const end = deadline ? Date.parse(deadline) : NaN;
  const [now, setNow] = useState(Date.now);
  const offset = useMemo(() => serverTime && Number.isFinite(Date.parse(serverTime)) ? Date.parse(serverTime) - Date.now() : 0, [serverTime]);
  const expiredFor = useRef<number | null>(null);
  const callback = useRef(onExpire); callback.current = onExpire;
  const remaining = Number.isFinite(end) ? Math.max(0, Math.ceil((end - now - offset) / 1000)) : 0;
  useEffect(() => {
    if (!Number.isFinite(end) || completed || inactive) return;
    const tick = () => setNow(Date.now()); tick();
    const interval = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick); document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); };
  }, [end, completed, inactive]);
  useEffect(() => {
    if (Number.isFinite(end) && remaining === 0 && !completed && !inactive && expiredFor.current !== end) {
      expiredFor.current = end; callback.current?.();
    }
  }, [end, remaining, completed, inactive]);
  if (!Number.isFinite(end) || completed || inactive) return null;
  const days = Math.floor(remaining / 86400), hours = Math.floor(remaining % 86400 / 3600), minutes = Math.floor(remaining % 3600 / 60), seconds = remaining % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  const urgent = remaining < 3600;
  return <div className={`mt-3 rounded-2xl border p-3 ${urgent ? "border-rose-200 bg-rose-50 text-rose-700" : "border-[#c8e5ea] bg-[#eef8fa] text-[#007f95]"}`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-xs font-bold"><AppIcon name="clock" className="h-4 w-4" />Hạn trả phí kết nối</span><strong className="tabular-nums text-base tracking-wide" aria-label="Thời gian thanh toán còn lại">{remaining > 0 ? `${days ? `${days} ngày · ` : ""}${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : "Đã hết thời gian"}</strong></div>
    <p className="mt-1 text-[11px] leading-5">{remaining > 0 ? "Hai bên cần trả đủ phí trước hạn. Nếu một bên chưa trả, phí đã trả được hoàn về ví khi hệ thống xử lý hết hạn." : "Đang cập nhật trạng thái hết hạn và khoản hoàn phí vào ví."}</p>
    <p className="text-[10px] opacity-75">Đến {new Date(end).toLocaleString("vi-VN")}</p>
  </div>;
}
