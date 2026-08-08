import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { notificationService } from "../services/notificationService";
import { NotificationSocketConnection, type NotificationSocketStatus } from "../services/notificationSocketService";
import type { NotificationItem } from "../types/notification";

interface NotificationContextValue {
  unreadCount: number;
  socketStatus: NotificationSocketStatus;
  latestNotification: NotificationItem | null;
  refreshUnreadCount: () => Promise<void>;
  markReadLocally: (wasUnread: boolean) => void;
  clearUnreadLocally: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [socketStatus, setSocketStatus] = useState<NotificationSocketStatus>("DISCONNECTED");
  const [latestNotification, setLatestNotification] = useState<NotificationItem | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      setUnreadCount(await notificationService.getUnreadCount());
    } catch {
      // Keep the existing badge if a transient refresh fails.
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setLatestNotification(null);
      setSocketStatus("DISCONNECTED");
      return;
    }

    void refreshUnreadCount();
    const connection = new NotificationSocketConnection({
      onNotification: (notification) => {
        setLatestNotification(notification);
        void notificationService.getUnreadCount()
          .then(setUnreadCount)
          .catch(() => undefined);
      },
      onStatusChange: setSocketStatus,
    });
    connection.connect();
    return () => connection.disconnect();
  }, [user, refreshUnreadCount]);

  const markReadLocally = useCallback((wasUnread: boolean) => {
    if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const clearUnreadLocally = useCallback(() => setUnreadCount(0), []);

  const value = useMemo<NotificationContextValue>(() => ({
    unreadCount,
    socketStatus,
    latestNotification,
    refreshUnreadCount,
    markReadLocally,
    clearUnreadLocally,
  }), [unreadCount, socketStatus, latestNotification, refreshUnreadCount, markReadLocally, clearUnreadLocally]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotifications must be used inside NotificationProvider");
  return value;
}
