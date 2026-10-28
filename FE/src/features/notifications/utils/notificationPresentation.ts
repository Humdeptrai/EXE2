import type { ComponentProps } from "react";
import type { AppIcon } from "../../../components/ui/AppIcon";
import type { NotificationType } from "../../../types/notification";

type Presentation = {
  label: string;
  icon: ComponentProps<typeof AppIcon>["name"];
  iconClass: string;
  badgeClass: string;
};

// Keep literal classes so Tailwind includes every notification style in production.
const presentations: Record<NotificationType, Presentation> = {
  JOB_INTEREST_RECEIVED: { label: "Ứng viên quan tâm", icon: "users", iconClass: "bg-sky-100 text-sky-700", badgeClass: "bg-sky-50 text-sky-800" },
  CANDIDATE_ACCEPTED: { label: "Ứng tuyển được chấp nhận", icon: "check", iconClass: "bg-emerald-100 text-emerald-700", badgeClass: "bg-emerald-50 text-emerald-800" },
  CANDIDATE_REJECTED: { label: "Ứng tuyển bị từ chối", icon: "close", iconClass: "bg-rose-100 text-rose-700", badgeClass: "bg-rose-50 text-rose-800" },
  PAYMENT_RECEIVED: { label: "Thanh toán", icon: "wallet", iconClass: "bg-lime-100 text-lime-800", badgeClass: "bg-lime-50 text-lime-900" },
  CONNECTION_SUCCEEDED: { label: "Kết nối thành công", icon: "link", iconClass: "bg-teal-100 text-teal-700", badgeClass: "bg-teal-50 text-teal-800" },
  CHAT_MESSAGE_RECEIVED: { label: "Tin nhắn", icon: "chat", iconClass: "bg-indigo-100 text-indigo-700", badgeClass: "bg-indigo-50 text-indigo-800" },
  REPORT_RESOLVED: { label: "Báo cáo đã xử lý", icon: "list", iconClass: "bg-blue-100 text-blue-700", badgeClass: "bg-blue-50 text-blue-800" },
  REPORT_REJECTED: { label: "Báo cáo bị từ chối", icon: "info", iconClass: "bg-orange-100 text-orange-700", badgeClass: "bg-orange-50 text-orange-800" },
  IDENTITY_REVIEWED: { label: "Xác minh tài khoản", icon: "shield-check", iconClass: "bg-cyan-100 text-cyan-700", badgeClass: "bg-cyan-50 text-cyan-800" },
  SKILL_REVIEWED: { label: "Kỹ năng & sở thích", icon: "edit", iconClass: "bg-violet-100 text-violet-700", badgeClass: "bg-violet-50 text-violet-800" },
  RATING_RECEIVED: { label: "Đánh giá", icon: "star", iconClass: "bg-amber-100 text-amber-700", badgeClass: "bg-amber-50 text-amber-800" },
};
const fallback: Presentation = { label: "Thông báo", icon: "bell", iconClass: "bg-slate-100 text-slate-600", badgeClass: "bg-slate-100 text-slate-700" };

export function notificationPresentation(type: string): Presentation {
  return Object.prototype.hasOwnProperty.call(presentations, type) ? presentations[type as NotificationType] : fallback;
}
