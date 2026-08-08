package com.handsfree.be.service;

import com.handsfree.be.constant.NotificationType;
import com.handsfree.be.dto.response.NotificationResponse;
import com.handsfree.be.dto.response.NotificationUnreadCountResponse;
import com.handsfree.be.dto.response.PageResponse;
import com.handsfree.be.entity.User;

import java.util.UUID;

public interface NotificationService {
    PageResponse<NotificationResponse> getNotifications(UUID userId, int page, int size);

    NotificationUnreadCountResponse getUnreadCount(UUID userId);

    NotificationResponse markRead(UUID userId, UUID notificationId);

    NotificationUnreadCountResponse markAllRead(UUID userId);

    NotificationResponse create(
            User recipient,
            NotificationType type,
            String title,
            String message,
            UUID referenceId,
            String actionUrl
    );
}
