import { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { NotificationContext, type NotificationContextValue } from "./NotificationContext";
import { notificationService } from "../services/notificationService";
import { NotificationSocketConnection, type NotificationSocketStatus } from "../services/notificationSocketService";
import type { NotificationItem } from "../types/notification";

export function NotificationProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  // A different account starts with an empty state and cannot reuse another user's callbacks.
  return <UserNotifications key={user?.id ?? "guest"} userId={user?.id ?? null}>{children}</UserNotifications>;
}

function UserNotifications({ children, userId }: PropsWithChildren<{ userId: string | null }>) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [socketStatus, setSocketStatus] = useState<NotificationSocketStatus>("DISCONNECTED");
  const [latestNotification, setLatestNotification] = useState<NotificationItem | null>(null);
  const listeners = useRef(new Set<(item: NotificationItem) => void>());
  const active = useRef(false);

  const refreshUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const count = await notificationService.getUnreadCount();
      if (active.current) setUnreadCount(count);
    } catch {
      // Keep the existing badge if a transient refresh fails.
    }
  }, [userId]);

  useEffect(() => {
    active.current = true;
    if (!userId) return () => { active.current = false; };
    void notificationService.getUnreadCount()
      .then((count) => { if (active.current) setUnreadCount(count); })
      .catch(() => undefined);
    const connection = new NotificationSocketConnection({
      onNotification: (notification) => {
        if (!active.current) return;
        setLatestNotification(notification);
        for (const listener of listeners.current) listener(notification);
        void refreshUnreadCount();
      },
      onStatusChange: (status) => { if (active.current) setSocketStatus(status); },
    });
    connection.connect();
    return () => {
      active.current = false;
      connection.disconnect();
    };
  }, [userId, refreshUnreadCount]);

  const subscribeNotifications = useCallback((listener: (item: NotificationItem) => void) => {
    listeners.current.add(listener);
    return () => { listeners.current.delete(listener); };
  }, []);
  const markReadLocally = useCallback((wasUnread: boolean) => {
    if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
  }, []);
  const clearUnreadLocally = useCallback(() => setUnreadCount(0), []);
  const value = useMemo<NotificationContextValue>(() => ({
    unreadCount, socketStatus, latestNotification, refreshUnreadCount,
    markReadLocally, clearUnreadLocally, subscribeNotifications,
  }), [unreadCount, socketStatus, latestNotification, refreshUnreadCount,
    markReadLocally, clearUnreadLocally, subscribeNotifications]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
