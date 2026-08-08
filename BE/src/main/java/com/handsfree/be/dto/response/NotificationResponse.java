package com.handsfree.be.dto.response;

import com.handsfree.be.constant.NotificationType;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        NotificationType type,
        String title,
        String message,
        UUID referenceId,
        String actionUrl,
        boolean read,
        Instant readAt,
        Instant createdAt
) {
}
