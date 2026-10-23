package com.handsfree.be.repository;

import com.handsfree.be.entity.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    interface AttachmentMetadata {
        String getProvider(); String getStorageKey(); String getContentType(); String getOriginalName(); Long getSizeBytes();
    }
    // Same participant/payment/ledger gates as ContactAccess, resolved in one query without user/job payloads.
    @Query("""
        select msg.attachmentProvider as provider, msg.attachmentKey as storageKey,
            msg.attachmentType as contentType, msg.attachmentName as originalName, msg.attachmentSize as sizeBytes
        from ChatMessage msg join msg.conversation c join c.jobMatch m
        where msg.id = :message and c.id = :conversation and msg.attachmentKey is not null
          and (m.consumer.id = :user or m.provider.id = :user)
          and m.status <> com.handsfree.be.constant.MatchStatus.EXPIRED
          and m.connectionSucceededAt is not null and m.chatUnlockedAt is not null
          and exists (select p.id from ConnectionPayment p where p.jobMatch = m
            and p.consumerPaymentMethod = com.handsfree.be.constant.PaymentMethod.WALLET
            and p.providerPaymentMethod = com.handsfree.be.constant.PaymentMethod.WALLET
            and p.consumerPaymentStatus = com.handsfree.be.constant.PaymentStatus.PAID
            and p.providerPaymentStatus = com.handsfree.be.constant.PaymentStatus.PAID)
          and exists (select e.id from WalletEntry e
            where e.dedupeKey = concat('CONNECT:', cast(m.id as string), ':', cast(m.consumer.id as string)))
          and exists (select e.id from WalletEntry e
            where e.dedupeKey = concat('CONNECT:', cast(m.id as string), ':', cast(m.provider.id as string)))
        """)
    Optional<AttachmentMetadata> findAccessibleAttachment(@Param("user") UUID user,
            @Param("conversation") UUID conversation, @Param("message") UUID message);

    @Query("select count(m) from ChatMessage m where m.sender.id <> :userId and m.readAt is null "
            + "and m.conversation in (select c from ChatConversation c where c.jobMatch.connectionSucceededAt is not null                       and c.jobMatch.chatUnlockedAt is not null                       and exists (select p.id from ConnectionPayment p where p.jobMatch = c.jobMatch                 and p.consumerPaymentMethod = com.handsfree.be.constant.PaymentMethod.WALLET                 and p.providerPaymentMethod = com.handsfree.be.constant.PaymentMethod.WALLET                 and p.consumerPaymentStatus = com.handsfree.be.constant.PaymentStatus.PAID                 and p.providerPaymentStatus = com.handsfree.be.constant.PaymentStatus.PAID)               and (c.jobMatch.consumer.id = :userId or c.jobMatch.provider.id = :userId))")
    long countAllUnread(@Param("userId") UUID userId);

    @EntityGraph(attributePaths = {"sender"})
    Page<ChatMessage> findAllByConversation_IdOrderBySentAtDesc(UUID conversationId, Pageable pageable);

    @EntityGraph(attributePaths = {"sender"})
    Optional<ChatMessage> findByConversation_IdAndSender_IdAndClientMessageId(
            UUID conversationId,
            UUID senderId,
            UUID clientMessageId
    );

    @Query("""
            select count(message)
            from ChatMessage message
            where message.conversation.id = :conversationId
              and message.sender.id <> :userId
              and message.readAt is null
            """)
    long countUnread(
            @Param("conversationId") UUID conversationId,
            @Param("userId") UUID userId
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update ChatMessage message
            set message.readAt = :readAt
            where message.conversation.id = :conversationId
              and message.sender.id <> :readerId
              and message.readAt is null
            """)
    int markUnreadAsRead(
            @Param("conversationId") UUID conversationId,
            @Param("readerId") UUID readerId,
            @Param("readAt") Instant readAt
    );
}
