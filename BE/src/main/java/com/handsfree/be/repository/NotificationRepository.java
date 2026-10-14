package com.handsfree.be.repository;

import com.handsfree.be.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    @Query("select n from Notification n where n.recipient.id = :recipientId and n.type <> com.handsfree.be.constant.NotificationType.CHAT_MESSAGE_RECEIVED order by n.createdAt desc")
    Page<Notification> findAllByRecipient_IdOrderByCreatedAtDesc(@Param("recipientId") UUID recipientId, Pageable pageable);

    @Query("select count(n) from Notification n where n.recipient.id = :recipientId and n.readAt is null and n.type <> com.handsfree.be.constant.NotificationType.CHAT_MESSAGE_RECEIVED")
    long countByRecipient_IdAndReadAtIsNull(@Param("recipientId") UUID recipientId);

    Optional<Notification> findByIdAndRecipient_Id(UUID notificationId, UUID recipientId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Notification n
               set n.readAt = :readAt
             where n.recipient.id = :recipientId
               and n.readAt is null
            """)
    int markAllRead(@Param("recipientId") UUID recipientId, @Param("readAt") Instant readAt);
}
