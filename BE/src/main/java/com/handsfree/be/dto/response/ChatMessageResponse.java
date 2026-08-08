package com.handsfree.be.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        UUID conversationId,
        UUID clientMessageId,
        UUID senderId,
        String senderName,
        String senderAvatarUrl,
        String content,
        Instant sentAt,
        Instant readAt
) {}
