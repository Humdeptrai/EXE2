import api from "../config/axios";
import type { ApiResponse } from "../types/api";
import type { PageResponse } from "../types/job";
import type { NotificationItem, NotificationUnreadCount } from "../types/notification";

export const notificationService = {
  async getNotifications(page = 0, size = 20): Promise<PageResponse<NotificationItem>> {
    const response = await api.get<ApiResponse<PageResponse<NotificationItem>>>("/notifications", {
      params: { page, size },
    });
    return response.data.result;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get<ApiResponse<NotificationUnreadCount>>("/notifications/unread-count");
    return response.data.result.unreadCount;
  },

  async markRead(notificationId: string): Promise<NotificationItem> {
    const response = await api.post<ApiResponse<NotificationItem>>(`/notifications/${notificationId}/read`);
    return response.data.result;
  },

  async markAllRead(): Promise<number> {
    const response = await api.post<ApiResponse<NotificationUnreadCount>>("/notifications/read-all");
    return response.data.result.unreadCount;
  },
};
