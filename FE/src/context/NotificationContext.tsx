import { createContext, useContext } from "react";
import type { NotificationSocketStatus } from "../services/notificationSocketService";
import type { NotificationItem } from "../types/notification";

export interface NotificationContextValue {
  unreadCount: number;
  socketStatus: NotificationSocketStatus;
  latestNotification: NotificationItem | null;
  refreshUnreadCount: () => Promise<void>;
  markReadLocally: (wasUnread: boolean) => void;
  clearUnreadLocally: () => void;
  subscribeNotifications: (listener: (item: NotificationItem) => void) => () => void;
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotifications must be used inside NotificationProvider");
  return value;
}
