package com.handsfree.be.dto.response;

import java.util.UUID;

public record ChatReadResponse(
        UUID conversationId,
        int markedRead
) {}
