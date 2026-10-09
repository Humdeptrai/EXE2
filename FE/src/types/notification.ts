export type NotificationType =
  | "JOB_INTEREST_RECEIVED"
  | "CANDIDATE_ACCEPTED"
  | "CANDIDATE_REJECTED"
  | "PAYMENT_RECEIVED"
  | "CONNECTION_SUCCEEDED"
  | "CHAT_MESSAGE_RECEIVED"
  | "RATING_RECEIVED"
  | "REPORT_RESOLVED"
  | "REPORT_REJECTED";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId: string | null;
  actionUrl: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationUnreadCount {
  unreadCount: number;
}
