import { AppIcon } from "../ui/AppIcon";
import "./feedback.css";

export interface NoticeProps {
  message: string;
  onClose?: () => void;
  error?: boolean;
  tone?: "error" | "success" | "info";
  className?: string;
  id?: string;
  compact?: boolean;
}

// Backend codes share this presentation; the API message remains authoritative.
export default function UserNotice({ message, onClose, error = false, tone, className = "", id, compact = false }: NoticeProps) {
  const kind = tone ?? (error ? "error" : "info");
  return <div id={id} className={`hf-user-notice hf-user-notice-${kind}${compact ? " hf-user-notice-compact" : ""} ${className}`}
    role={kind === "error" ? "alert" : "status"} aria-atomic="true">
    <AppIcon name={kind === "success" ? "check" : "info"} className="hf-notice-icon" />
    <p>{message}</p>
    {onClose && <button type="button" onClick={onClose} aria-label="Đóng thông báo"><AppIcon name="close" className="hf-notice-icon" /></button>}
  </div>;
}
