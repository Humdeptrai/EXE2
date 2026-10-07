package com.handsfree.be.mapper;

import com.handsfree.be.dto.response.NotificationResponse;
import com.handsfree.be.entity.Notification;
import org.springframework.stereotype.Component;
import com.handsfree.be.serviceImpl.ContactPrivacy;

@Component
public class NotificationMapper {
    public NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                ContactPrivacy.redact(notification.getTitle()),
                ContactPrivacy.redact(notification.getMessage()),
                notification.getReferenceId(),
                notification.getActionUrl(),
                notification.getReadAt() != null,
                notification.getReadAt(),
                notification.getCreatedAt()
        );
    }
}
