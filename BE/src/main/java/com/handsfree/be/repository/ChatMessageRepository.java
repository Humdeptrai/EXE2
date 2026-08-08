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
