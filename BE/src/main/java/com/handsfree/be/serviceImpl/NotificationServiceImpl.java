package com.handsfree.be.serviceImpl;

import com.handsfree.be.constant.NotificationType;
import com.handsfree.be.dto.response.NotificationResponse;
import com.handsfree.be.dto.response.NotificationUnreadCountResponse;
import com.handsfree.be.dto.response.PageResponse;
import com.handsfree.be.entity.Notification;
import com.handsfree.be.entity.User;
import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import com.handsfree.be.mapper.NotificationMapper;
import com.handsfree.be.repository.NotificationRepository;
import com.handsfree.be.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {
    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getNotifications(UUID userId, int page, int size) {
        Page<NotificationResponse> result = notificationRepository
                .findAllByRecipient_IdOrderByCreatedAtDesc(
                        userId,
                        PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50))
                )
                .map(notificationMapper::toResponse);
        return PageResponse.from(result);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationUnreadCountResponse getUnreadCount(UUID userId) {
        return new NotificationUnreadCountResponse(notificationRepository.countByRecipient_IdAndReadAtIsNull(userId));
    }

    @Override
    @Transactional
    public NotificationResponse markRead(UUID userId, UUID notificationId) {
        Notification notification = notificationRepository.findByIdAndRecipient_Id(notificationId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));
        if (notification.getReadAt() == null) {
            notification.setReadAt(Instant.now());
            notificationRepository.save(notification);
        }
        return notificationMapper.toResponse(notification);
    }

    @Override
    @Transactional
    public NotificationUnreadCountResponse markAllRead(UUID userId) {
        notificationRepository.markAllRead(userId, Instant.now());
        return new NotificationUnreadCountResponse(0);
    }

    @Override
    @Transactional
    public NotificationResponse create(
            User recipient,
            NotificationType type,
            String title,
            String message,
            UUID referenceId,
            String actionUrl
    ) {
        Notification saved = notificationRepository.save(Notification.builder()
                .recipient(recipient)
                .type(type)
                .title(title)
                .message(message)
                .referenceId(referenceId)
                .actionUrl(actionUrl)
                .build());
        NotificationResponse response = notificationMapper.toResponse(saved);
        publishAfterCommit(recipient.getId(), response);
        return response;
    }

    private void publishAfterCommit(UUID recipientId, NotificationResponse response) {
        Runnable publish = () -> messagingTemplate.convertAndSendToUser(
                recipientId.toString(),
                "/queue/notifications",
                response
        );
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publish.run();
                }
            });
        } else {
            publish.run();
        }
    }
}
