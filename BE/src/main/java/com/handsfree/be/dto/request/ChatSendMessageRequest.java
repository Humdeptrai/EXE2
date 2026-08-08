package com.handsfree.be.dto.request;

import java.util.UUID;

public record ChatSendMessageRequest(
        UUID conversationId,
        UUID clientMessageId,
        String content
) {}
