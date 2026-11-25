import type { NotificationItem } from "../../../types/notification";
import { safeNext } from "../../../services/identityService";

export function notificationDestination(item: NotificationItem): string {
  if (item.actionUrl && safeNext(item.actionUrl) === item.actionUrl) return item.actionUrl;
  const id = item.referenceId ? encodeURIComponent(item.referenceId) : null;
  if (id && item.type === "MATCH_SCHEDULE_CHANGED") return `/matches/${id}/payment`;
  if (id && (item.type === "CANDIDATE_ACCEPTED" || item.type === "PAYMENT_RECEIVED")) return `/matches/${id}/payment`;
  if (id && item.type === "CONNECTION_SUCCEEDED") return `/messages/match/${id}`;
  if (id && item.type === "JOB_INTEREST_RECEIVED") return `/posts/${id}/candidates`;
  if (id && item.type === "CHAT_MESSAGE_RECEIVED") return `/messages/${id}`;
  if (id && (item.type === "REPORT_RESOLVED" || item.type === "REPORT_REJECTED")) return `/reports/${id}`;
  if (item.type === "RATING_RECEIVED") return "/profile";
  if (item.type === "IDENTITY_REVIEWED") return "/profile";
  if (item.type === "SKILL_REVIEWED") return "/profile?skills=1";
  return "/notifications";
}
